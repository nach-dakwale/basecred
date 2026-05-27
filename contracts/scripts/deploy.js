const { ethers, network } = require("hardhat");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be configured for deployment`);
  return value;
}

async function main() {
  if (!["baseSepolia", "base"].includes(network.name)) {
    throw new Error("Deploy only with --network baseSepolia or --network base");
  }
  const providerNetwork = await ethers.provider.getNetwork();
  const expectedChainId = network.name === "base" ? 8453n : 84532n;
  if (providerNetwork.chainId !== expectedChainId) {
    throw new Error(`RPC chain ID must be ${expectedChainId} for ${network.name}`);
  }
  if (network.name === "base") {
    const rpc = required("BASE_MAINNET_RPC_URL");
    if (rpc.includes("mainnet.base.org")) {
      throw new Error("Funded mainnet deployment requires a production RPC provider");
    }
  }

  const [deployer] = await ethers.getSigners();
  const oracle = ethers.getAddress(required("ORACLE_ADDRESS"));
  const owner = ethers.getAddress(required("OWNER_ADDRESS"));
  if (oracle === owner) throw new Error("OWNER_ADDRESS and ORACLE_ADDRESS must be distinct");
  const maximumPrincipal = ethers.parseEther(required("MAX_TOTAL_PRINCIPAL_ETH"));

  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Owner: ${owner}`);
  console.log(`Oracle: ${oracle}`);
  console.log(`Maximum active principal: ${ethers.formatEther(maximumPrincipal)} ETH`);

  const Pool = await ethers.getContractFactory("GitHubLoanPool");
  const pool = await Pool.deploy(oracle, owner, maximumPrincipal);
  await pool.waitForDeployment();
  const deploymentTransaction = pool.deploymentTransaction();
  if (!deploymentTransaction) throw new Error("Deployment transaction is unavailable");
  const address = await pool.getAddress();
  console.log(`GitHubLoanPool deployed to: ${address}`);
  console.log(`Deployment transaction: ${deploymentTransaction.hash}`);
  console.log("Record this address in the matching frontend build environment and deployment record.");
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
