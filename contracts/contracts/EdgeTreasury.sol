// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title EdgeTreasury
 * @author Edge60 Team - ETHGlobal 2026
 * @notice Minimal treasury contract for Edge60 prediction game on Arc
 * @dev Handles USDC deposits, match settlements with rake, and protocol revenue tracking
 * 
 * ============ DESIGN DECISIONS ============
 * - Uses USDC as the settlement token (6 decimals)
 * - Platform rake: 2.5% (configurable between 0-5%)
 * - Settlement is atomic: rake deducted + winner credited in single tx
 * - No matchmaking/session logic - handled off-chain for gas efficiency
 * - Owner-only settlement for hackathon demo (production: use signatures/oracles)
 */
contract EdgeTreasury is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ STATE VARIABLES ============
    
    /// @notice USDC token contract address
    IERC20 public immutable usdc;
    
    /// @notice Platform rake in basis points (250 = 2.5%)
    uint256 public rakeBps = 250;
    
    /// @notice Maximum allowed rake (5%)
    uint256 public constant MAX_RAKE_BPS = 500;
    
    /// @notice Basis points denominator
    uint256 public constant BPS_DENOMINATOR = 10000;
    
    /// @notice Total protocol revenue accumulated from rakes
    uint256 public protocolRevenue;
    
    /// @notice Total number of matches settled
    uint256 public totalMatchesSettled;
    
    /// @notice Total volume processed through the treasury
    uint256 public totalVolume;

    // ============ EVENTS ============
    
    /// @notice Emitted when a match is settled
    event MatchSettled(
        address indexed winner,
        uint256 matchId,
        uint256 grossAmount,
        uint256 rake,
        uint256 netPayout
    );
    
    /// @notice Emitted when protocol revenue is withdrawn
    event RevenueWithdrawn(address indexed to, uint256 amount);
    
    /// @notice Emitted when rake percentage is updated
    event RakeUpdated(uint256 oldRake, uint256 newRake);
    
    /// @notice Emitted when USDC is deposited to treasury
    event Deposited(address indexed from, uint256 amount);

    // ============ ERRORS ============
    
    error InvalidAddress();
    error InvalidAmount();
    error InvalidRake();
    error InsufficientBalance();

    // ============ CONSTRUCTOR ============
    
    /**
     * @notice Initialize the treasury with USDC token address
     * @param _usdc Address of the USDC token contract
     * @dev On Arc testnet, use the bridged USDC address
     */
    constructor(address _usdc) Ownable(msg.sender) {
        if (_usdc == address(0)) revert InvalidAddress();
        usdc = IERC20(_usdc);
    }

    // ============ EXTERNAL FUNCTIONS ============
    
    /**
     * @notice Deposit USDC into the treasury (for match pool)
     * @param amount Amount of USDC to deposit (6 decimals)
     * @dev Players deposit before match; frontend handles escrow tracking
     */
    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) revert InvalidAmount();
        
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        
        emit Deposited(msg.sender, amount);
    }

    /**
     * @notice Settle a match and pay the winner (minus rake)
     * @param winner Address of the match winner
     * @param amount Total prize pool amount (both players' stakes)
     * @param matchId Off-chain match identifier for event tracking
     * @dev Only callable by owner (game server) for hackathon demo
     *      Production version would use signed messages or oracle
     */
    function settleMatch(
        address winner,
        uint256 amount,
        uint256 matchId
    ) external onlyOwner nonReentrant {
        if (winner == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        if (usdc.balanceOf(address(this)) < amount) revert InsufficientBalance();
        
        // Calculate rake and net payout
        uint256 rake = (amount * rakeBps) / BPS_DENOMINATOR;
        uint256 netPayout = amount - rake;
        
        // Update protocol revenue tracking
        protocolRevenue += rake;
        totalMatchesSettled += 1;
        totalVolume += amount;
        
        // Transfer net winnings to winner
        usdc.safeTransfer(winner, netPayout);
        
        emit MatchSettled(winner, matchId, amount, rake, netPayout);
    }

    /**
     * @notice Get current protocol revenue
     * @return Total accumulated rake revenue in USDC
     */
    function getProtocolRevenue() external view returns (uint256) {
        return protocolRevenue;
    }

    /**
     * @notice Get treasury statistics
     * @return _totalMatches Total matches settled
     * @return _totalVolume Total USDC volume processed
     * @return _protocolRevenue Total rake collected
     * @return _currentBalance Current USDC balance in treasury
     */
    function getStats() external view returns (
        uint256 _totalMatches,
        uint256 _totalVolume,
        uint256 _protocolRevenue,
        uint256 _currentBalance
    ) {
        return (
            totalMatchesSettled,
            totalVolume,
            protocolRevenue,
            usdc.balanceOf(address(this))
        );
    }

    // ============ ADMIN FUNCTIONS ============
    
    /**
     * @notice Update the platform rake percentage
     * @param newRakeBps New rake in basis points (max 500 = 5%)
     */
    function setRake(uint256 newRakeBps) external onlyOwner {
        if (newRakeBps > MAX_RAKE_BPS) revert InvalidRake();
        
        emit RakeUpdated(rakeBps, newRakeBps);
        rakeBps = newRakeBps;
    }

    /**
     * @notice Withdraw accumulated protocol revenue
     * @param to Address to send revenue to
     * @param amount Amount to withdraw
     */
    function withdrawRevenue(address to, uint256 amount) external onlyOwner {
        if (to == address(0)) revert InvalidAddress();
        if (amount > protocolRevenue) revert InsufficientBalance();
        
        protocolRevenue -= amount;
        usdc.safeTransfer(to, amount);
        
        emit RevenueWithdrawn(to, amount);
    }
}
