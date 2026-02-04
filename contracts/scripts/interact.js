/**
 * EdgeTreasury Interaction Examples
 *
 * Demonstrates the full flow:
 *   1. Player deposits USDC
 *   2. Game server settles match
 *   3. Query protocol stats
 *
 * Run: npx hardhat run scripts/interact.js --network arc
 */

const hre = require("hardhat");

// Update these after deployment
const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS || "0x...";
const USDC_ADDRESS = process.env.USDC_ADDRESS || "0x...";

async function main() {
  const [owner, player1, player2] = await hre.ethers.getSigners();

  console.log("============ EDGE60 TREASURY DEMO ============\n");

  // Connect to contracts
  const treasury = await hre.ethers.getContractAt(
    "EdgeTreasury",
    TREASURY_ADDRESS
  );
  const usdc = await hre.ethers.getContractAt("IERC20", USDC_ADDRESS);

  // ============ STEP 1: Players Deposit USDC ============
  console.log("📥 STEP 1: Players deposit USDC for match\n");

  const stakeAmount = hre.ethers.parseUnits("10", 6); // 10 USDC (6 decimals)

  // Player 1 approves and deposits
  await usdc.connect(player1).approve(TREASURY_ADDRESS, stakeAmount);
  await treasury.connect(player1).deposit(stakeAmount);
  console.log(`  Player 1 (${player1.address}) deposited 10 USDC`);

  // Player 2 approves and deposits
  await usdc.connect(player2).approve(TREASURY_ADDRESS, stakeAmount);
  await treasury.connect(player2).deposit(stakeAmount);
  console.log(`  Player 2 (${player2.address}) deposited 10 USDC\n`);

  // ============ STEP 2: Game Server Settles Match ============
  console.log("🎮 STEP 2: Game server settles match\n");

  // Match ends - Player 1 wins!
  // Total prize pool = 20 USDC (both stakes combined)
  const prizePool = hre.ethers.parseUnits("20", 6);
  const matchId = 1;

  // Server calls settleMatch (owner only)
  const tx = await treasury.connect(owner).settleMatch(
    player1.address, // winner
    prizePool, // total amount (20 USDC)
    matchId // match ID for tracking
  );

  const receipt = await tx.wait();

  // Parse the MatchSettled event
  const event = receipt.logs.find((log) => {
    try {
      return treasury.interface.parseLog(log)?.name === "MatchSettled";
    } catch {
      return false;
    }
  });

  if (event) {
    const parsed = treasury.interface.parseLog(event);
    const [winner, mId, gross, rake, net] = parsed.args;
    console.log(`  Match #${mId} settled:`);
    console.log(`  Winner: ${winner}`);
    console.log(`  Gross:  ${hre.ethers.formatUnits(gross, 6)} USDC`);
    console.log(`  Rake:   ${hre.ethers.formatUnits(rake, 6)} USDC (2.5%)`);
    console.log(`  Payout: ${hre.ethers.formatUnits(net, 6)} USDC\n`);
  }

  // ============ STEP 3: Query Protocol Stats ============
  console.log("📊 STEP 3: Protocol statistics\n");

  const [totalMatches, totalVolume, revenue, balance] =
    await treasury.getStats();

  console.log(`  Total matches:  ${totalMatches}`);
  console.log(
    `  Total volume:   ${hre.ethers.formatUnits(totalVolume, 6)} USDC`
  );
  console.log(`  Protocol rev:   ${hre.ethers.formatUnits(revenue, 6)} USDC`);
  console.log(`  Treasury bal:   ${hre.ethers.formatUnits(balance, 6)} USDC\n`);

  // Using getProtocolRevenue() directly
  const protocolRev = await treasury.getProtocolRevenue();
  console.log(
    `  getProtocolRevenue(): ${hre.ethers.formatUnits(protocolRev, 6)} USDC\n`
  );

  console.log("============ DEMO COMPLETE ============\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
