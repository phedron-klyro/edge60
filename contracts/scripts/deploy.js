/**
 * EdgeTreasury Deployment Script
 *
 * Deploys the Edge60 Treasury contract for match settlements.
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network baseSepolia
 *   npx hardhat run scripts/deploy.js --network arcTestnet
 *
 * Required env:
 *   PRIVATE_KEY - Deployer wallet private key
 *   USDC_ADDRESS - USDC token address on target network
 */

const hre = require("hardhat");

// Network-specific USDC addresses
const USDC_ADDRESSES = {
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e", // Circle USDC
  arcTestnet: "0x3600000000000000000000000000000000000000",
  localhost: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

async function main() {
  const networkName = hre.network.name;

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║            EDGE60 TREASURY DEPLOYMENT                         ║
╠══════════════════════════════════════════════════════════════╣
║ Network: ${networkName.padEnd(51)}║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Get USDC address
  const USDC_ADDRESS = process.env.USDC_ADDRESS || USDC_ADDRESSES[networkName];
  if (
    !USDC_ADDRESS ||
    USDC_ADDRESS === "0x0000000000000000000000000000000000000000"
  ) {
    throw new Error(`USDC address not configured for network: ${networkName}`);
  }

  const [deployer] = await hre.ethers.getSigners();
  const balance = await deployer.provider.getBalance(deployer.address);

  console.log("Deployer:     ", deployer.address);
  console.log("Balance:      ", hre.ethers.formatEther(balance), "ETH");
  console.log("USDC Address: ", USDC_ADDRESS);
  console.log("");

  // Check balance
  if (balance < hre.ethers.parseEther("0.01")) {
    console.warn(
      "⚠️  Warning: Low deployer balance. May fail if gas is insufficient."
    );
  }

  // ============================================
  // DEPLOY EDGETREASURY
  // ============================================
  console.log("📦 Deploying EdgeTreasury...");

  const EdgeTreasury = await hre.ethers.getContractFactory("EdgeTreasury");
  const treasury = await EdgeTreasury.deploy(USDC_ADDRESS);
  await treasury.waitForDeployment();

  const treasuryAddress = await treasury.getAddress();
  const deployTx = treasury.deploymentTransaction();

  console.log("✅ EdgeTreasury deployed!");
  console.log("   Address:  ", treasuryAddress);
  console.log("   Tx Hash:  ", deployTx?.hash);
  console.log("   Block:    ", deployTx?.blockNumber || "pending");
  console.log("");

  // ============================================
  // VERIFY CONTRACT STATE
  // ============================================
  console.log("🔍 Verifying contract state...");

  const owner = await treasury.owner();
  const rakeBps = await treasury.rakeBps();
  const usdc = await treasury.usdc();

  console.log("   Owner:    ", owner);
  console.log("   Rake:     ", Number(rakeBps) / 100, "%");
  console.log("   USDC:     ", usdc);
  console.log("");

  // ============================================
  // VERIFY ON BLOCK EXPLORER (Optional)
  // ============================================
  if (process.env.VERIFY === "true") {
    console.log("🔎 Verifying on block explorer...");
    try {
      // Wait for a few blocks
      console.log("   Waiting for block confirmations...");
      await new Promise((resolve) => setTimeout(resolve, 30000));

      await hre.run("verify:verify", {
        address: treasuryAddress,
        constructorArguments: [USDC_ADDRESS],
      });
      console.log("✅ Contract verified!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
      console.log("   You can verify manually later.");
    }
    console.log("");
  }

  // ============================================
  // DEPLOYMENT SUMMARY
  // ============================================
  const explorerUrl =
    networkName === "baseSepolia"
      ? `https://sepolia.basescan.org/address/${treasuryAddress}`
      : `https://testnet.explorer.arc.io/address/${treasuryAddress}`;

  console.log(`
╔══════════════════════════════════════════════════════════════╗
║                    DEPLOYMENT COMPLETE                        ║
╠══════════════════════════════════════════════════════════════╣
║                                                              ║
║  Contract:  ${treasuryAddress}  ║
║  Network:   ${networkName.padEnd(48)}║
║  USDC:      ${USDC_ADDRESS}  ║
║  Owner:     ${deployer.address}  ║
║  Rake:      2.5%                                             ║
║                                                              ║
╠══════════════════════════════════════════════════════════════╣
║  NEXT STEPS:                                                 ║
║                                                              ║
║  1. Update .env files with TREASURY_ADDRESS:                 ║
║     TREASURY_ADDRESS=${treasuryAddress}                          ║
║                                                              ║
║  2. Fund the treasury with USDC for settlements              ║
║                                                              ║
║  3. View on explorer:                                        ║
║     ${explorerUrl.slice(0, 58)}  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  `);

  // Return for testing
  return {
    treasury: treasuryAddress,
    usdc: USDC_ADDRESS,
    deployer: deployer.address,
    network: networkName,
  };
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
