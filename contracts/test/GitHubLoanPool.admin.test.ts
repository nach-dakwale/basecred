import { expect } from "chai";
import { ethers } from "hardhat";

const ID = ethers.id("github:reserve-test");

describe("GitHubLoanPool loss controls", function () {
  async function fixture(score = 250) {
    const [deployer, owner, oracle, wallet, other, successor] = await ethers.getSigners();
    const Pool = await ethers.getContractFactory("GitHubLoanPool", deployer);
    const pool = await Pool.deploy(oracle.address, owner.address, ethers.parseEther("1"));
    await pool.waitForDeployment();
    await deployer.sendTransaction({ to: await pool.getAddress(), value: ethers.parseEther("2") });
    await pool.connect(oracle).setScoreAndBind(ID, wallet.address, score, ethers.id("proof"));
    return { pool, owner, oracle, wallet, other, successor };
  }

  it("reserves borrower collateral against owner withdrawals", async function () {
    const { pool, owner, wallet } = await fixture();
    const amount = ethers.parseEther("0.05");
    await pool.connect(wallet).requestLoan(amount, { value: amount });
    expect(await pool.totalReservedCollateral()).to.equal(amount);
    const balance = await ethers.provider.getBalance(await pool.getAddress());
    await expect(pool.connect(owner).withdrawPool(balance))
      .to.be.revertedWithCustomError(pool, "InsufficientFreeLiquidity");
    await pool.connect(owner).withdrawPool(balance - amount);
    await expect(pool.connect(wallet).repayLoan({ value: ethers.parseEther("0.055") }))
      .to.emit(pool, "LoanRepaid");
    expect(await pool.totalReservedCollateral()).to.equal(0);
  });

  it("caps aggregate active principal and permits changes only while paused", async function () {
    const { pool, owner, wallet } = await fixture(625);
    await pool.connect(wallet).requestLoan(ethers.parseEther("0.75"));
    await expect(pool.connect(owner).setMaxTotalPrincipal(ethers.parseEther("2")))
      .to.be.revertedWithCustomError(pool, "MustBePaused");
    await pool.connect(owner).pause();
    await expect(pool.connect(owner).setMaxTotalPrincipal(ethers.parseEther("0.5")))
      .to.be.revertedWithCustomError(pool, "ExposureLimitExceeded");
    await pool.connect(owner).setMaxTotalPrincipal(ethers.parseEther("2"));
    expect(await pool.maxTotalPrincipal()).to.equal(ethers.parseEther("2"));
  });

  it("rotates or revokes the oracle only through owner control", async function () {
    const { pool, owner, oracle, other } = await fixture();
    await expect(pool.connect(other).setOracle(other.address))
      .to.be.revertedWithCustomError(pool, "NotOwner");
    await expect(pool.connect(owner).setOracle(other.address))
      .to.emit(pool, "OracleUpdated").withArgs(oracle.address, other.address);
    await pool.connect(owner).setOracle(ethers.ZeroAddress);
    await expect(pool.connect(other).setScoreAndBind(ethers.id("new"), other.address, 300, ethers.id("new-proof")))
      .to.be.revertedWithCustomError(pool, "NotOracle");
  });

  it("transfers ownership using two steps and keeps oracle separate", async function () {
    const { pool, owner, oracle, other, successor } = await fixture();
    await expect(pool.connect(owner).transferOwnership(oracle.address))
      .to.be.revertedWithCustomError(pool, "RoleCollision");
    await pool.connect(owner).transferOwnership(successor.address);
    await expect(pool.connect(other).acceptOwnership())
      .to.be.revertedWithCustomError(pool, "NotPendingOwner");
    await expect(pool.connect(successor).acceptOwnership())
      .to.emit(pool, "OwnershipTransferred").withArgs(owner.address, successor.address);
    expect(await pool.owner()).to.equal(successor.address);
  });
});
