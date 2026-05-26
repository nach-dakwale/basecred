import { expect } from "chai";
import { ethers, network } from "hardhat";

const ID = ethers.id("github:identity-one");
const OTHER_ID = ethers.id("github:identity-two");

describe("GitHubLoanPool identity credit", function () {
  async function deploy() {
    const [deployer, owner, oracle, wallet, nextWallet, liquidator] = await ethers.getSigners();
    const Pool = await ethers.getContractFactory("GitHubLoanPool", deployer);
    const pool = await Pool.deploy(oracle.address, owner.address, ethers.parseEther("2"));
    await pool.waitForDeployment();
    await deployer.sendTransaction({ to: await pool.getAddress(), value: ethers.parseEther("5") });
    return { pool, owner, oracle, wallet, nextWallet, liquidator };
  }

  async function bind(score = 625) {
    const fixture = await deploy();
    await fixture.pool.connect(fixture.oracle).setScoreAndBind(ID, fixture.wallet.address, score, ethers.id("nonce-1"));
    return fixture;
  }

  it("binds score to a proven identity wallet and consumes proof nonce", async function () {
    const { pool, oracle, wallet } = await deploy();
    await expect(pool.connect(oracle).setScoreAndBind(ID, wallet.address, 400, ethers.id("nonce-1")))
      .to.emit(pool, "WalletBound").withArgs(ID, wallet.address);
    expect(await pool.walletForIdentity(ID)).to.equal(wallet.address);
    expect(await pool.identityForWallet(wallet.address)).to.equal(ID);
    await expect(pool.connect(oracle).setScoreAndBind(ID, wallet.address, 400, ethers.id("nonce-1")))
      .to.be.revertedWithCustomError(pool, "ProofAlreadyUsed");
  });

  it("enforces maximum score and oracle authorization", async function () {
    const { pool, oracle, wallet, nextWallet } = await deploy();
    await expect(pool.connect(wallet).setScoreAndBind(ID, wallet.address, 400, ethers.id("nonce-1")))
      .to.be.revertedWithCustomError(pool, "NotOracle");
    await expect(pool.connect(oracle).setScoreAndBind(ID, nextWallet.address, 651, ethers.id("nonce-2")))
      .to.be.revertedWithCustomError(pool, "InvalidScore");
  });

  it("prevents one GitHub identity borrowing through another wallet", async function () {
    const { pool, oracle, wallet, nextWallet } = await bind();
    await pool.connect(wallet).requestLoan(ethers.parseEther("0.50"));
    await expect(pool.connect(oracle).setScoreAndBind(ID, nextWallet.address, 625, ethers.id("nonce-2")))
      .to.be.revertedWithCustomError(pool, "AlreadyHasLoan");
    await expect(pool.connect(nextWallet).requestLoan(ethers.parseEther("0.50")))
      .to.be.revertedWithCustomError(pool, "WalletNotBound");
  });

  it("allows migration only after cooldown without an active loan", async function () {
    const { pool, oracle, nextWallet } = await bind(400);
    await expect(pool.connect(oracle).setScoreAndBind(ID, nextWallet.address, 400, ethers.id("nonce-2")))
      .to.be.revertedWithCustomError(pool, "MigrationCooldown");
    await network.provider.send("evm_increaseTime", [30 * 24 * 60 * 60 + 1]);
    await network.provider.send("evm_mine");
    await pool.connect(oracle).setScoreAndBind(ID, await pool.walletForIdentity(ID), 400, ethers.id("nonce-3"));
    await expect(pool.connect(oracle).setScoreAndBind(ID, nextWallet.address, 400, ethers.id("nonce-4")))
      .to.emit(pool, "WalletMigrated");
  });

  it("does not permit two identities to bind the same wallet", async function () {
    const { pool, oracle, wallet } = await bind();
    await expect(pool.connect(oracle).setScoreAndBind(OTHER_ID, wallet.address, 400, ethers.id("nonce-2")))
      .to.be.revertedWithCustomError(pool, "WalletAlreadyBound");
  });

  it("persists a default and blocks refreshed credit", async function () {
    const { pool, oracle, wallet, liquidator } = await bind(625);
    await pool.connect(wallet).requestLoan(ethers.parseEther("0.50"));
    await network.provider.send("hardhat_mine", ["0x34bc1"]);
    await pool.connect(liquidator).liquidate(ID);
    expect(await pool.defaulted(ID)).to.equal(true);
    expect(await pool.badDebt(ID)).to.equal(ethers.parseEther("0.50"));
    await expect(pool.connect(oracle).setScoreAndBind(ID, wallet.address, 625, ethers.id("nonce-2")))
      .to.be.revertedWithCustomError(pool, "IdentityDefaulted");
    await expect(pool.connect(wallet).requestLoan(ethers.parseEther("0.50")))
      .to.be.revertedWithCustomError(pool, "IdentityDefaulted");
  });
});
