# Edge60 Treasury Contract

Minimal on-chain treasury for Edge60 prediction game, deployed on Arc.

## Overview

EdgeTreasury handles USDC settlements for 1v1 BTC price prediction matches:

- **Accept USDC deposits** from players entering matches
- **Apply 2.5% rake** on prize pool settlements
- **Credit winners** with net payout after rake
- **Track protocol revenue** for sustainability

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Edge60 Architecture                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   Frontend (Next.js)  ──────►  Backend (Bun/WS)             │
│        │                            │                        │
│        │ deposit()                  │ settleMatch()          │
│        ▼                            ▼                        │
│   ┌─────────────────────────────────────────────┐           │
│   │           EdgeTreasury.sol (Arc)            │           │
│   │                                             │           │
│   │  • USDC deposits                            │           │
│   │  • 2.5% rake calculation                    │           │
│   │  • Winner payouts                           │           │
│   │  • Protocol revenue tracking                │           │
│   └─────────────────────────────────────────────┘           │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Contract: EdgeTreasury.sol

| Function                               | Access | Description                       |
| -------------------------------------- | ------ | --------------------------------- |
| `deposit(amount)`                      | Public | Players deposit USDC before match |
| `settleMatch(winner, amount, matchId)` | Owner  | Settle match with rake deduction  |
| `getProtocolRevenue()`                 | View   | Total rake collected              |
| `getStats()`                           | View   | Matches, volume, revenue, balance |
| `setRake(newRakeBps)`                  | Owner  | Update rake (max 5%)              |
| `withdrawRevenue(to, amount)`          | Owner  | Withdraw collected fees           |

## Quick Start

```bash
# Install dependencies
cd contracts
npm install

# Configure environment
cp .env.example .env
# Edit .env with your private key and USDC address

# Compile
npm run compile

# Deploy to Arc
npm run deploy:arc

# Run interaction demo
npm run interact
```

## Example Flow

```solidity
// 1. Player deposits 10 USDC
usdc.approve(treasury, 10e6);
treasury.deposit(10e6);

// 2. Both players deposited - match runs off-chain
// ... BTC price prediction game ...

// 3. Game server settles (Player1 won)
treasury.settleMatch(
    player1,     // winner address
    20e6,        // total prize pool (both stakes)
    matchId      // off-chain match ID
);

// Result:
// - Rake: 0.5 USDC (2.5% of 20)
// - Player1 receives: 19.5 USDC
// - Protocol keeps: 0.5 USDC
```

## Design Decisions

### Why Owner-Only Settlement?

For hackathon scope, the game server (owner) handles settlement. Production would use:

- EIP-712 signed messages from both players
- Oracle attestation
- zkProof of game result

### Why USDC?

- Stable value for fair betting
- 6 decimals standard
- Widely available on Arc via bridges

### Why 2.5% Rake?

- Competitive with prediction markets
- Sustainable for protocol
- Adjustable via `setRake()` (0-5%)

## Security Features

- **ReentrancyGuard**: Prevents reentrancy attacks
- **SafeERC20**: Safe token transfers
- **Ownable**: Admin function protection
- **Custom Errors**: Gas-efficient error handling
- **Immutable USDC**: Cannot change token address

## Gas Estimates

| Function    | Gas (approx) |
| ----------- | ------------ |
| deposit     | ~65,000      |
| settleMatch | ~85,000      |
| getStats    | ~5,000       |

## Testing

```bash
# Run local node
npm run node

# In another terminal, deploy locally
npm run deploy:local
```

## Contract Stats (target)

- **Lines**: 148 (under 150 ✓)
- **Functions**: 6 external
- **Events**: 4
- **No matchmaking logic** ✓
- **No sessions** ✓
- **No game state** ✓

---

Built for ETHGlobal 2026 🚀
