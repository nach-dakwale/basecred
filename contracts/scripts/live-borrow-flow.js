// Live end-to-end borrow flow on Base Sepolia.
// Creates a throwaway oracle wallet, funds it, runs the full loan lifecycle, then restores.

const { ethers } = require("hardhat");

const POOL_ADDRESS = "0x7608558Bf63f0924eC3FB5D27BD32E1440681eFE";
const ORIGINAL_ORACLE = "0xAE10cC5F84c52DD69B21Bfc8837ffd8C1Daad6c1";

async function main() {
  const [owner] = await ethers.getSigners();
  console.log("Owner:", owner.address);

  // Throwaway oracle wallet (deterministic, no secret stored)
  const tempOracleWallet = new ethers.Wallet(
    ethers.keccak256(ethers.toUtf8Bytes("basecred-live-test-oracle")),
    ethers.provider
  );
  console.log("Temp oracle:", tempOracleWallet.address);

  const pool = await ethers.getContractAt("GitHubLoanPool", POOL_ADDRESS);

  const poolBal = await ethers.provider.getBalance(POOL_ADDRESS);
  const ownerBal = await ethers.provider.getBalance(owner.address);
  console.log("\nPool:", ethers.formatEther(poolBal), "ETH | Owner:", ethers.formatEther(ownerBal), "ETH");

  // --- 1. Seed pool + fund temp oracle for gas ---
  console.log("\n[1] Seeding pool with 0.002 ETH + funding temp oracle for gas...");
  const seedTx = await owner.sendTransaction({ to: POOL_ADDRESS, value: ethers.parseEther("0.002") });
  await seedTx.wait();
  const gasFundTx = await owner.sendTransaction({ to: tempOracleWallet.address, value: ethers.parseEther("0.001") });
  await gasFundTx.wait();
  console.log("    Pool:", ethers.formatEther(await ethers.provider.getBalance(POOL_ADDRESS)), "ETH");

  // --- 2. Set oracle = temp wallet (not owner, so no RoleCollision) ---
  console.log("\n[2] Setting oracle to temp wallet...");
  await (await pool.setOracle(tempOracleWallet.address)).wait();
  console.log("    Oracle:", await pool.oracle());

  // --- 3. Bind identity + set score (signed by temp oracle) ---
  const identityId = ethers.keccak256(ethers.toUtf8Bytes("live-test-nach-dakwale-2026-06-01"));
  const proofNonce = ethers.keccak256(ethers.toUtf8Bytes("live-nonce-001"));
  const score = 650;
  console.log("\n[3] Oracle binding identity, score 650...");
  const poolAsOracle = pool.connect(tempOracleWallet);
  await (await poolAsOracle.setScoreAndBind(identityId, owner.address, score, proofNonce)).wait();
  console.log("    Score:", (await pool.scores(identityId)).toString());
  console.log("    Max loan:", ethers.formatEther(await pool.maxLoan(identityId)), "ETH");
  console.log("    Collateral BPS:", (await pool.collateralBps(identityId)).toString(), "(0 = uncollateralized)");

  // --- 4. Request loan ---
  const loanAmount = ethers.parseEther("0.001");
  console.log("\n[4] Requesting 0.001 ETH loan...");
  const loanTx = await pool.requestLoan(loanAmount, { value: 0n });
  const loanReceipt = await loanTx.wait();
  const loan = await pool.loans(identityId);
  console.log("    Active:", loan.active, "| Amount:", ethers.formatEther(loan.amount), "ETH");
  console.log("    Tx:", loanReceipt.hash);

  // --- 5. Repay ---
  const interestBps = await pool.interestBps();
  const interest = (loanAmount * interestBps) / 10000n;
  const repayAmount = loanAmount + interest;
  console.log("\n[5] Repaying", ethers.formatEther(repayAmount), "ETH (principal + 10%)...");
  const repayTx = await pool.repayLoan({ value: repayAmount });
  const repayReceipt = await repayTx.wait();
  console.log("    Loan active after:", (await pool.loans(identityId)).active);
  console.log("    Tx:", repayReceipt.hash);

  // --- 6. Check dividends ---
  const dividendsAddr = await pool.dividends();
  const divsBal = await ethers.provider.getBalance(dividendsAddr);
  console.log("\n[6] Dividends balance:", ethers.formatEther(divsBal), "ETH (80% of interest flows here)");

  // --- 7. Restore original oracle ---
  console.log("\n[7] Restoring original oracle...");
  await (await pool.setOracle(ORIGINAL_ORACLE)).wait();
  console.log("    Oracle restored:", await pool.oracle());

  console.log("\n=== LIVE BORROW FLOW COMPLETE ===");
  console.log("Pool final balance:", ethers.formatEther(await ethers.provider.getBalance(POOL_ADDRESS)), "ETH");
}

main().catch((e) => { console.error(e); process.exit(1); });
