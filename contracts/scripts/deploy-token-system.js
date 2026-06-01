const { ethers, network } = require("hardhat");

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set`);
  return value;
}

async function main() {
  if (!["baseSepolia", "base"].includes(network.name)) {
    throw new Error("Deploy only with --network baseSepolia or --network base");
  }

  const [deployer] = await ethers.getSigners();
  const oracle = ethers.getAddress(required("ORACLE_ADDRESS"));
  const owner = ethers.getAddress(required("OWNER_ADDRESS"));
  const treasury = ethers.getAddress(required("TREASURY_ADDRESS"));
  const maxPrincipal = ethers.parseEther(required("MAX_TOTAL_PRINCIPAL_ETH"));

  console.log(`Network:   ${network.name}`);
  console.log(`Deployer:  ${deployer.address}`);
  console.log(`Owner:     ${owner}`);
  console.log(`Oracle:    ${oracle}`);
  console.log(`Treasury:  ${treasury}`);

  // 1. Deploy token
  const Token = await ethers.getContractFactory("BaseCreditToken");
  const token = await Token.deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddr = await token.getAddress();
  console.log(`BaseCreditToken: ${tokenAddr}`);

  // 2. Deploy dividends
  const Dividends = await ethers.getContractFactory("CredDividends");
  const dividends = await Dividends.deploy(tokenAddr);
  await dividends.waitForDeployment();
  const dividendsAddr = await dividends.getAddress();
  console.log(`CredDividends:   ${dividendsAddr}`);

  // 3. Wire token -> dividends (one-time)
  await (await token.setDividends(dividendsAddr)).wait();
  console.log("Token wired to CredDividends");

  // 4. Deploy loan pool
  const Pool = await ethers.getContractFactory("GitHubLoanPool");
  const pool = await Pool.deploy(oracle, owner, maxPrincipal, treasury);
  await pool.waitForDeployment();
  const poolAddr = await pool.getAddress();
  console.log(`GitHubLoanPool:  ${poolAddr}`);

  // 5. Wire dividends -> pool (one-time)
  await (await dividends.setLoanPool(poolAddr)).wait();
  console.log("CredDividends wired to pool");

  // 6. Wire pool -> dividends (owner = deployer on testnet)
  if (deployer.address.toLowerCase() === owner.toLowerCase()) {
    const poolAsOwner = await ethers.getContractAt("GitHubLoanPool", poolAddr, deployer);
    await (await poolAsOwner.setDividends(dividendsAddr)).wait();
    console.log("Pool wired to CredDividends");
  } else {
    const iface = new ethers.Interface(["function setDividends(address)"]);
    const cd = iface.encodeFunctionData("setDividends", [dividendsAddr]);
    console.log(`MANUAL: call pool.setDividends(${dividendsAddr}) from owner`);
    console.log(`Calldata: ${cd}`);
  }

  // 7. Deploy private sale
  const Sale = await ethers.getContractFactory("CredPrivateSale");
  const sale = await Sale.deploy(tokenAddr);
  await sale.waitForDeployment();
  const saleAddr = await sale.getAddress();
  console.log(`CredPrivateSale: ${saleAddr}`);

  // 8. Deploy TimelockController (deployer is admin, will renounce after wiring governor)
  const TWO_DAYS = 2 * 24 * 60 * 60;
  const TimelockFactory = await ethers.getContractFactory("TimelockController");
  const timelock = await TimelockFactory.deploy(TWO_DAYS, [], [], deployer.address);
  await timelock.waitForDeployment();
  const timelockAddr = await timelock.getAddress();
  console.log(`TimelockController: ${timelockAddr}`);

  // 9. Deploy Governor
  const Governor = await ethers.getContractFactory("CredGovernor");
  const governor = await Governor.deploy(tokenAddr, timelockAddr);
  await governor.waitForDeployment();
  const governorAddr = await governor.getAddress();
  console.log(`CredGovernor:    ${governorAddr}`);

  // 10. Wire timelock roles: governor is proposer + executor, deployer renounces admin
  const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
  const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
  const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
  await (await timelock.grantRole(PROPOSER_ROLE, governorAddr)).wait();
  await (await timelock.grantRole(EXECUTOR_ROLE, governorAddr)).wait();
  await (await timelock.renounceRole(ADMIN_ROLE, deployer.address)).wait();
  console.log("Timelock roles wired");

  // 11. Transfer token ownership to protocol owner
  await (await token.transferOwnership(owner)).wait();
  console.log(`Token ownership transferred to ${owner}`);

  // 12. Seed pool with ETH if deployer has spare funds
  const deployerBal = await ethers.provider.getBalance(deployer.address);
  const seedAmount = ethers.parseEther("0.001");
  if (deployerBal > seedAmount + ethers.parseEther("0.001")) {
    await (await deployer.sendTransaction({ to: poolAddr, value: seedAmount })).wait();
    console.log(`Pool seeded with 0.001 ETH`);
  }

  const summary = { tokenAddr, dividendsAddr, poolAddr, saleAddr, timelockAddr, governorAddr };
  console.log("\n--- Deployment summary ---");
  console.log(JSON.stringify(summary, null, 2));
  return summary;
}

main().catch((e) => { console.error(e.message); process.exit(1); });
