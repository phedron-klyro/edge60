const { expect } = require("chai");
const { ethers } = require("hardhat");

/**
 * EdgeTreasury Test Suite
 *
 * Run: npx hardhat test
 */
describe("EdgeTreasury", function () {
  let treasury;
  let mockUsdc;
  let owner;
  let player1;
  let player2;

  const INITIAL_BALANCE = ethers.parseUnits("1000", 6); // 1000 USDC
  const STAKE_AMOUNT = ethers.parseUnits("10", 6); // 10 USDC per player

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();

    // Deploy mock USDC
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    mockUsdc = await MockERC20.deploy("USD Coin", "USDC", 6);

    // Mint USDC to players
    await mockUsdc.mint(player1.address, INITIAL_BALANCE);
    await mockUsdc.mint(player2.address, INITIAL_BALANCE);

    // Deploy Treasury
    const EdgeTreasury = await ethers.getContractFactory("EdgeTreasury");
    treasury = await EdgeTreasury.deploy(await mockUsdc.getAddress());
  });

  describe("Deployment", function () {
    it("Should set correct USDC address", async function () {
      expect(await treasury.usdc()).to.equal(await mockUsdc.getAddress());
    });

    it("Should set initial rake to 2.5%", async function () {
      expect(await treasury.rakeBps()).to.equal(250);
    });

    it("Should set owner correctly", async function () {
      expect(await treasury.owner()).to.equal(owner.address);
    });
  });

  describe("Deposits", function () {
    it("Should accept USDC deposits", async function () {
      await mockUsdc
        .connect(player1)
        .approve(await treasury.getAddress(), STAKE_AMOUNT);
      await treasury.connect(player1).deposit(STAKE_AMOUNT);

      expect(await mockUsdc.balanceOf(await treasury.getAddress())).to.equal(
        STAKE_AMOUNT
      );
    });

    it("Should emit Deposited event", async function () {
      await mockUsdc
        .connect(player1)
        .approve(await treasury.getAddress(), STAKE_AMOUNT);

      await expect(treasury.connect(player1).deposit(STAKE_AMOUNT))
        .to.emit(treasury, "Deposited")
        .withArgs(player1.address, STAKE_AMOUNT);
    });

    it("Should reject zero deposits", async function () {
      await expect(
        treasury.connect(player1).deposit(0)
      ).to.be.revertedWithCustomError(treasury, "InvalidAmount");
    });
  });

  describe("Match Settlement", function () {
    beforeEach(async function () {
      // Both players deposit
      await mockUsdc
        .connect(player1)
        .approve(await treasury.getAddress(), STAKE_AMOUNT);
      await mockUsdc
        .connect(player2)
        .approve(await treasury.getAddress(), STAKE_AMOUNT);
      await treasury.connect(player1).deposit(STAKE_AMOUNT);
      await treasury.connect(player2).deposit(STAKE_AMOUNT);
    });

    it("Should settle match with correct rake", async function () {
      const prizePool = STAKE_AMOUNT * 2n; // 20 USDC
      const expectedRake = (prizePool * 250n) / 10000n; // 2.5% = 0.5 USDC
      const expectedPayout = prizePool - expectedRake; // 19.5 USDC

      await treasury.settleMatch(player1.address, prizePool, 1);

      expect(await mockUsdc.balanceOf(player1.address)).to.equal(
        INITIAL_BALANCE - STAKE_AMOUNT + expectedPayout
      );
    });

    it("Should update protocol revenue", async function () {
      const prizePool = STAKE_AMOUNT * 2n;
      const expectedRake = (prizePool * 250n) / 10000n;

      await treasury.settleMatch(player1.address, prizePool, 1);

      expect(await treasury.protocolRevenue()).to.equal(expectedRake);
      expect(await treasury.getProtocolRevenue()).to.equal(expectedRake);
    });

    it("Should emit MatchSettled event", async function () {
      const prizePool = STAKE_AMOUNT * 2n;
      const expectedRake = (prizePool * 250n) / 10000n;
      const expectedPayout = prizePool - expectedRake;

      await expect(treasury.settleMatch(player1.address, prizePool, 1))
        .to.emit(treasury, "MatchSettled")
        .withArgs(player1.address, 1, prizePool, expectedRake, expectedPayout);
    });

    it("Should only allow owner to settle", async function () {
      await expect(
        treasury
          .connect(player1)
          .settleMatch(player1.address, STAKE_AMOUNT * 2n, 1)
      ).to.be.revertedWithCustomError(treasury, "OwnableUnauthorizedAccount");
    });
  });

  describe("Protocol Stats", function () {
    it("Should track total matches and volume", async function () {
      await mockUsdc
        .connect(player1)
        .approve(await treasury.getAddress(), STAKE_AMOUNT * 2n);
      await mockUsdc
        .connect(player2)
        .approve(await treasury.getAddress(), STAKE_AMOUNT * 2n);

      // Match 1
      await treasury.connect(player1).deposit(STAKE_AMOUNT);
      await treasury.connect(player2).deposit(STAKE_AMOUNT);
      await treasury.settleMatch(player1.address, STAKE_AMOUNT * 2n, 1);

      // Match 2
      await treasury.connect(player1).deposit(STAKE_AMOUNT);
      await treasury.connect(player2).deposit(STAKE_AMOUNT);
      await treasury.settleMatch(player2.address, STAKE_AMOUNT * 2n, 2);

      const [totalMatches, totalVolume, revenue] = await treasury.getStats();

      expect(totalMatches).to.equal(2);
      expect(totalVolume).to.equal(STAKE_AMOUNT * 4n);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update rake", async function () {
      await treasury.setRake(300); // 3%
      expect(await treasury.rakeBps()).to.equal(300);
    });

    it("Should reject rake above max", async function () {
      await expect(treasury.setRake(600)).to.be.revertedWithCustomError(
        treasury,
        "InvalidRake"
      );
    });

    it("Should allow revenue withdrawal", async function () {
      // Setup: deposit and settle a match
      await mockUsdc
        .connect(player1)
        .approve(await treasury.getAddress(), STAKE_AMOUNT);
      await mockUsdc
        .connect(player2)
        .approve(await treasury.getAddress(), STAKE_AMOUNT);
      await treasury.connect(player1).deposit(STAKE_AMOUNT);
      await treasury.connect(player2).deposit(STAKE_AMOUNT);
      await treasury.settleMatch(player1.address, STAKE_AMOUNT * 2n, 1);

      const revenue = await treasury.protocolRevenue();
      await treasury.withdrawRevenue(owner.address, revenue);

      expect(await mockUsdc.balanceOf(owner.address)).to.equal(revenue);
      expect(await treasury.protocolRevenue()).to.equal(0);
    });
  });
});
