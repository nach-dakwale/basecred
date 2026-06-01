import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";

async function deployFixture() {
  const [deployer, oracle, owner, treasury, borrower, tokenHolder] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("BaseCreditToken");
  const token = await Token.deploy(deployer.address);

  const Dividends = await ethers.getContractFactory("CredDividends");
  const dividends = await Dividends.deploy(await token.getAddress());

  await token.setDividends(await dividends.getAddress());

  const Pool = await ethers.getContractFactory("GitHubLoanPool");
  const pool = await Pool.deploy(
    oracle.address,
    owner.address,
    ethers.parseEther("10"),
    treasury.address
  );

  await dividends.setLoanPool(await pool.getAddress());
  await pool.connect(owner).setDividends(await dividends.getAddress());

  // Fund the pool
  await owner.sendTransaction({ to: await pool.getAddress(), value: ethers.parseEther("5") });

  // Bind and score borrower at tier 4 (score 650 -> no collateral, max 0.75 ETH)
  const identityId = ethers.keccak256(ethers.toUtf8Bytes("borrower-gh"));
  const proofNonce = ethers.keccak256(ethers.toUtf8Bytes("nonce1"));
  await pool.connect(oracle).setScoreAndBind(identityId, borrower.address, 650, proofNonce);

  return { token, dividends, pool, deployer, oracle, owner, treasury, borrower, tokenHolder, identityId };
}

describe("GitHubLoanPool + CredDividends integration", () => {
  it("on repayment: 80% interest goes to dividends, 20% to treasury", async () => {
    const { dividends, pool, owner, treasury, borrower, tokenHolder, token } = await loadFixture(deployFixture);

    // Give tokenHolder 100% of supply so they capture all dividends
    await token.transfer(tokenHolder.address, await token.totalSupply());

    const loanAmount = ethers.parseEther("0.5");
    await pool.connect(borrower).requestLoan(loanAmount, { value: 0n });

    const interest = (loanAmount * 1000n) / 10000n; // 10% = 0.05 ETH
    const protocolCut = (interest * 2000n) / 10000n; // 20% = 0.01 ETH
    const holderShare = interest - protocolCut;      // 80% = 0.04 ETH

    const due = loanAmount + interest;
    const treasuryBefore = await ethers.provider.getBalance(treasury.address);
    const divBefore = await ethers.provider.getBalance(await dividends.getAddress());

    await pool.connect(borrower).repayLoan({ value: due });

    const treasuryAfter = await ethers.provider.getBalance(treasury.address);
    const divAfter = await ethers.provider.getBalance(await dividends.getAddress());

    expect(treasuryAfter - treasuryBefore).to.equal(protocolCut);
    expect(divAfter - divBefore).to.equal(holderShare);
    expect(await dividends.pendingReward(tokenHolder.address)).to.be.closeTo(
      holderShare,
      ethers.parseEther("0.000001")
    );
  });

  it("governance: owner can update interestBps and it affects next repayment", async () => {
    const { pool, owner, borrower, dividends, token, tokenHolder } = await loadFixture(deployFixture);
    await token.transfer(tokenHolder.address, await token.totalSupply());

    await pool.connect(owner).setInterestBps(500); // change to 5%

    const loanAmount = ethers.parseEther("0.4");
    await pool.connect(borrower).requestLoan(loanAmount, { value: 0n });

    const interest = (loanAmount * 500n) / 10000n; // 5%
    const holderShare = (interest * 8000n) / 10000n; // 80%

    await pool.connect(borrower).repayLoan({ value: loanAmount + interest });

    expect(await dividends.pendingReward(tokenHolder.address)).to.be.closeTo(
      holderShare,
      ethers.parseEther("0.000001")
    );
  });

  it("setInterestBps reverts above 50%", async () => {
    const { pool, owner } = await loadFixture(deployFixture);
    await expect(pool.connect(owner).setInterestBps(5001)).to.be.revertedWithCustomError(pool, "InvalidBps");
  });

  it("setProtocolFeeBps updates split correctly", async () => {
    const { pool, owner, borrower, dividends, treasury, token, tokenHolder } = await loadFixture(deployFixture);
    await token.transfer(tokenHolder.address, await token.totalSupply());

    await pool.connect(owner).setProtocolFeeBps(5000); // 50/50 split

    const loanAmount = ethers.parseEther("0.4");
    await pool.connect(borrower).requestLoan(loanAmount, { value: 0n });
    const interest = (loanAmount * 1000n) / 10000n;
    const treasuryBefore = await ethers.provider.getBalance(treasury.address);
    await pool.connect(borrower).repayLoan({ value: loanAmount + interest });
    const treasuryAfter = await ethers.provider.getBalance(treasury.address);

    expect(treasuryAfter - treasuryBefore).to.equal(interest / 2n);
  });
});
