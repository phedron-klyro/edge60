/**
 * Fund Treasury Script
 *
 * Deposits USDC into the EdgeTreasury contract for match settlements.
 *
 * Prerequisites:
 *   1. Deploy the contract first: npm run deploy:base-sepolia
 *   2. Get testnet USDC from: https://faucet.circle.com/
 *   3. Update TREASURY_ADDRESS in .env
 *
 * Usage:
 *   npm run fund
 *   AMOUNT=100 npm run fund
 */

const hre = require("hardhat");

async function main() {
  const networkName = hre.network.name;
  const TREASURY_ADDRESS = process.env.TREASURY_ADDRESS;
  const USDC_ADDRESS =
    process.env.USDC_ADDRESS || "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
  const AMOUNT = process.env.AMOUNT || "10"; // Default 100 USDC

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║              FUND EDGE60 TREASURY                             ║
╠══════════════════════════════════════════════════════════════╣
║ Network:   ${networkName.padEnd(49)}║
║ Treasury:  ${
    TREASURY_ADDRESS?.slice(0, 42).padEnd(49) || "NOT SET".padEnd(49)
  }║
║ Amount:    ${(AMOUNT + " USDC").padEnd(49)}║
╚══════════════════════════════════════════════════════════════╝
  `);

  if (
    !TREASURY_ADDRESS ||
    TREASURY_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error("TREASURY_ADDRESS not set. Deploy the contract first.");
  }

  const [signer] = await hre.ethers.getSigners();
  console.log("Signer:", signer.address);

  // Get contracts
  const usdc = await hre.ethers.getContractAt("IERC20", USDC_ADDRESS);
  const treasury = await hre.ethers.getContractAt(
    "EdgeTreasury",
    TREASURY_ADDRESS,
  );

  // Check balances
  const signerBalance = await usdc.balanceOf(signer.address);
  const treasuryBalance = await usdc.balanceOf(TREASURY_ADDRESS);

  console.log(`\nCurrent Balances:`);
  console.log(`  Signer:   ${hre.ethers.formatUnits(signerBalance, 6)} USDC`);
  console.log(`  Treasury: ${hre.ethers.formatUnits(treasuryBalance, 6)} USDC`);

  const amountWei = hre.ethers.parseUnits(AMOUNT, 6);

  if (signerBalance < amountWei) {
    console.log(`\n⚠️  Insufficient USDC balance!`);
    console.log(`   Need: ${AMOUNT} USDC`);
    console.log(`   Have: ${hre.ethers.formatUnits(signerBalance, 6)} USDC`);
    console.log(`\n   Get testnet USDC from: https://faucet.circle.com/`);
    return;
  }

  // Get current nonce
  let nonce = await signer.getNonce("pending");
  console.log(`   Starting Nonce: ${nonce}`);

  // Approve USDC
  console.log(`\n📝 Approving ${AMOUNT} USDC...`);
  const approveTx = await usdc.approve(TREASURY_ADDRESS, amountWei, {
    nonce: nonce++,
  });
  await approveTx.wait();
  console.log(`   Tx: ${approveTx.hash}`);

  // Deposit
  console.log(`\n💰 Depositing ${AMOUNT} USDC to treasury...`);
  const depositTx = await treasury.deposit(amountWei, { nonce: nonce++ });
  await depositTx.wait();
  console.log(`   Tx: ${depositTx.hash}`);

  // Verify
  const newTreasuryBalance = await usdc.balanceOf(TREASURY_ADDRESS);
  console.log(`\n✅ Deposit complete!`);
  console.log(
    `   Treasury balance: ${hre.ethers.formatUnits(
      newTreasuryBalance,
      6,
    )} USDC`,
  );

  // Get stats
  const [totalMatches, totalVolume, revenue, balance] =
    await treasury.getStats();
  console.log(`\n📊 Treasury Stats:`);
  console.log(`   Total Matches:  ${totalMatches}`);
  console.log(
    `   Total Volume:   ${hre.ethers.formatUnits(totalVolume, 6)} USDC`,
  );
  console.log(`   Protocol Rev:   ${hre.ethers.formatUnits(revenue, 6)} USDC`);
  console.log(`   Balance:        ${hre.ethers.formatUnits(balance, 6)} USDC`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Error:", error);
    process.exit(1);
  });
