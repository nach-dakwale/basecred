const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deploying from: ${deployer.address}`);
  console.log(`Balance: ${ethers.formatEther(balance)} ETH`);

  const oracle = process.env.ORACLE_ADDRESS ?? deployer.address;
  console.log(`Oracle address: ${oracle}`);

  const Pool = await ethers.getContractFactory("GitHubLoanPool");
  const pool = await Pool.deploy(oracle);
  await pool.waitForDeployment();

  const address = await pool.getAddress();
  console.log(`\nGitHubLoanPool deployed to: ${address}`);
  console.log(`\nAdd to frontend wrangler.toml:`);
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS = "${address}"`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
