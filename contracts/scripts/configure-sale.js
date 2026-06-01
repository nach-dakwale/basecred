const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  const saleAddr = "0x3d6d4B29634967e7B6f0c149aF4eb6D63d9B8A82";
  const tokenAddr = "0xD71915f25FB8b725Cb8562ad306dBF42173FF583";

  const sale = await ethers.getContractAt("CredPrivateSale", saleAddr, deployer);
  const token = await ethers.getContractAt("BaseCreditToken", tokenAddr, deployer);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const startTime = now + 60n;          // 1 minute from now
  const endTime = now + 30n * 86400n;   // 30 days
  const priceWeiPerToken = ethers.parseEther("0.0001"); // 0.0001 ETH per baseCREDIT
  const hardCap = ethers.parseEther("10");              // 10 ETH cap

  console.log("Configuring sale...");
  await (await sale.configureSale(priceWeiPerToken, hardCap, startTime, endTime)).wait();
  console.log(`  Price: 0.0001 ETH / baseCREDIT`);
  console.log(`  Hard cap: 10 ETH`);
  console.log(`  Start: ${new Date(Number(startTime) * 1000).toISOString()}`);
  console.log(`  End:   ${new Date(Number(endTime) * 1000).toISOString()}`);

  // Fund the sale with 10M baseCREDIT
  const saleTokens = ethers.parseEther("10000000");
  console.log("Transferring 10M baseCREDIT to sale contract...");
  await (await token.transfer(saleAddr, saleTokens)).wait();
  console.log(`  Sale contract balance: ${ethers.formatEther(await token.balanceOf(saleAddr))} baseCREDIT`);
  console.log("Done.");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
