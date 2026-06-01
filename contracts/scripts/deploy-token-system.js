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

  // 6. Wire pool -> dividends (owner action)
  // Pool owner must call setDividends -- deployer != owner in prod, so log the calldata
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

  // 8. Transfer token ownership to protocol owner
  await (await token.transferOwnership(owner)).wait();
  console.log(`Token ownership transferred to ${owner}`);

  // 9. Log timelock + governor deploy instructions (manual -- needs owner)
  console.log("\n--- Governance (manual steps for owner) ---");
  console.log("1. Deploy TimelockController(minDelay=2days, proposers=[], executors=[])");
  console.log("2. Deploy CredGovernor(tokenAddr, timelockAddr)");
  console.log("3. timelock.grantRole(PROPOSER_ROLE, governorAddr)");
  console.log("4. timelock.grantRole(EXECUTOR_ROLE, governorAddr)");
  console.log("5. timelock.renounceRole(TIMELOCK_ADMIN_ROLE, deployerAddr)");
  console.log("6. pool.transferOwnership(timelockAddr)  -- via two-step acceptOwnership");

  console.log("\n--- Token distribution (manual steps for owner) ---");
  const supply = ethers.parseEther("100000000");
  console.log(`Total supply: 100,000,000 baseCREDIT`);
  console.log(`Send to CredPrivateSale (40M): token.transfer(${saleAddr}, ${(supply * 40n / 100n).toString()})`);
  console.log(`Team allocation (40M):         token.transfer(<vestingOrTeam>, ${(supply * 40n / 100n).toString()})`);
  console.log(`Treasury (10M):                token.transfer(${treasury}, ${(supply * 10n / 100n).toString()})`);
  console.log(`Ecosystem grants (10M):        token.transfer(<grants>, ${(supply * 10n / 100n).toString()})`);

  console.log("\n--- Deployment summary ---");
  console.log(JSON.stringify({ tokenAddr, dividendsAddr, poolAddr, saleAddr }, null, 2));
}

main().catch((e) => { console.error(e.message); process.exit(1); });
