/**
 * Verify EdgeTreasury on block explorer
 *
 * Usage:
 *   npx hardhat run scripts/verify.js --network arcTestnet
 *
 * Set TREASURY_ADDRESS to the deployed contract, or pass as env:
 *   TREASURY_ADDRESS=0x27d1642370e4223490f01D30D07C742DAaFd6977 npx hardhat run scripts/verify.js --network arcTestnet
 */

const hre = require("hardhat");

const USDC_ADDRESSES = {
  baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  arcTestnet: "0x3600000000000000000000000000000000000000",
  arc: "0x3600000000000000000000000000000000000000", // confirm for mainnet
};

async function main() {
  const networkName = hre.network.name;
  const treasuryAddress =
    process.env.TREASURY_ADDRESS || "0x27d1642370e4223490f01D30D07C742DAaFd6977";
  const usdcAddress =
    process.env.USDC_ADDRESS || USDC_ADDRESSES[networkName];

  if (!usdcAddress) {
    throw new Error(`USDC address not configured for network: ${networkName}`);
  }

  console.log("Verifying EdgeTreasury");
  console.log("  Network:", networkName);
  console.log("  Address:", treasuryAddress);
  console.log("  Constructor arg (USDC):", usdcAddress);

  await hre.run("verify:verify", {
    address: treasuryAddress,
    constructorArguments: [usdcAddress],
  });

  console.log("✅ Contract verified!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
