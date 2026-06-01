const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const tokenAddr = "0xD71915f25FB8b725Cb8562ad306dBF42173FF583";

  const token = await ethers.getContractAt("BaseCreditToken", tokenAddr, deployer);

  console.log("Self-delegating baseCREDIT voting power...");
  await (await token.delegate(deployer.address)).wait();
  console.log("Delegated. Voting power is now active.");

  const votes = await token.getVotes(deployer.address);
  console.log(`Votes: ${ethers.formatEther(votes)} baseCREDIT`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
