import { expect } from "chai";
import { ethers, network } from "hardhat";

const TIER_CASES = [
  { score: 100, tier: 0, max: "0" },
  { score: 250, tier: 1, max: "0.05" },
  { score: 400, tier: 2, max: "0.15" },
  { score: 550, tier: 3, max: "0.40" },
  { score: 625, tier: 4, max: "0.75" },
];

const BORROW_CASES = [
  { score: 250, amount: "0.05", collateral: "0.05" },
  { score: 400, amount: "0.15", collateral: "0.075" },
  { score: 550, amount: "0.40", collateral: "0.08" },
  { score: 625, amount: "0.75", collateral: "0" },
];

describe("GitHubLoanPool", function () {
  async function deployPool(funding = "5") {
    const [owner, oracle, borrower, liquidator, other] = await ethers.getSigners();
    const Pool = await ethers.getContractFactory("GitHubLoanPool");
    const pool = await Pool.deploy(oracle.address);
    await pool.waitForDeployment();

    if (funding !== "0") {
      await owner.sendTransaction({
        to: await pool.getAddress(),
        value: ethers.parseEther(funding),
      });
    }

    return { pool, owner, oracle, borrower, liquidator, other };
  }

  async function scoredBorrower(score = 250, funding = "5") {
    const fixture = await deployPool(funding);
    await fixture.pool.connect(fixture.oracle).setScore(fixture.borrower.address, score);
    return fixture;
  }

  describe("deployment", function () {
    it("sets initial ownership, oracle, and unpaused state", async function () {
      const { pool, owner, oracle, borrower } = await deployPool("0");

      expect(await pool.owner()).to.equal(owner.address);
      expect(await pool.oracle()).to.equal(oracle.address);
      expect(await pool.paused()).to.equal(false);
      expect(await pool.scores(borrower.address)).to.equal(0);
      expect((await pool.loans(borrower.address)).active).to.equal(false);
      expect(await ethers.provider.getBalance(await pool.getAddress())).to.equal(0);
    });
  });

  describe("scores and tiers", function () {
    it("lets only the oracle set scores and emits ScoreSet", async function () {
      const { pool, oracle, borrower, other } = await deployPool("0");

      await expect(pool.connect(other).setScore(borrower.address, 400))
        .to.be.revertedWithCustomError(pool, "NotOracle");
      await expect(pool.connect(oracle).setScore(borrower.address, 400))
        .to.emit(pool, "ScoreSet")
        .withArgs(borrower.address, 400);

      expect(await pool.scores(borrower.address)).to.equal(400);
      expect(await pool.scoreSetAt(borrower.address)).to.be.greaterThan(0);
    });

    for (const testCase of TIER_CASES) {
      it(`returns tier and max loan for score ${testCase.score}`, async function () {
        const { pool, oracle, borrower } = await deployPool("0");
        await pool.connect(oracle).setScore(borrower.address, testCase.score);

        expect(await pool.tier(borrower.address)).to.equal(testCase.tier);
        expect(await pool.maxLoan(borrower.address)).to.equal(ethers.parseEther(testCase.max));
      });
    }
  });

  describe("requestLoan", function () {
    for (const testCase of BORROW_CASES) {
      it(`originates a tier loan for score ${testCase.score}`, async function () {
        const { pool, oracle, borrower } = await deployPool();
        const amount = ethers.parseEther(testCase.amount);
        const collateral = ethers.parseEther(testCase.collateral);
        await pool.connect(oracle).setScore(borrower.address, testCase.score);

        await expect(pool.connect(borrower).requestLoan(amount, { value: collateral }))
          .to.emit(pool, "LoanRequested")
          .withArgs(borrower.address, amount, collateral);

        const loan = await pool.loans(borrower.address);
        expect(loan.amount).to.equal(amount);
        expect(loan.collateral).to.equal(collateral);
        expect(loan.active).to.equal(true);
      });
    }

    it("rejects a loan above the tier limit", async function () {
      const { pool, borrower } = await scoredBorrower();

      await expect(pool.connect(borrower).requestLoan(ethers.parseEther("0.051"), {
        value: ethers.parseEther("0.051"),
      })).to.be.revertedWithCustomError(pool, "ExceedsMaxLoan");
    });

    it("rejects borrowers with scores too low for a loan", async function () {
      const { pool, borrower } = await scoredBorrower(100);

      await expect(pool.connect(borrower).requestLoan(ethers.parseEther("0.01"), {
        value: ethers.parseEther("0.01"),
      })).to.be.revertedWithCustomError(pool, "ScoreTooLow");
    });

    it("rejects a second active loan", async function () {
      const { pool, borrower } = await scoredBorrower();
      const amount = ethers.parseEther("0.05");
      await pool.connect(borrower).requestLoan(amount, { value: amount });

      await expect(pool.connect(borrower).requestLoan(amount, { value: amount }))
        .to.be.revertedWithCustomError(pool, "AlreadyHasLoan");
    });

    it("rejects insufficient collateral", async function () {
      const { pool, borrower } = await scoredBorrower();

      await expect(pool.connect(borrower).requestLoan(ethers.parseEther("0.05"), {
        value: ethers.parseEther("0.049"),
      })).to.be.revertedWithCustomError(pool, "InsufficientCollateral");
    });

    it("rejects loans when pool liquidity cannot fund the principal", async function () {
      const { pool, borrower } = await scoredBorrower(625, "0");

      await expect(pool.connect(borrower).requestLoan(ethers.parseEther("0.10")))
        .to.be.revertedWithCustomError(pool, "PoolInsufficientFunds");
    });
  });

  describe("repayLoan", function () {
    async function activeLoan() {
      const fixture = await scoredBorrower();
      const amount = ethers.parseEther("0.05");
      await fixture.pool.connect(fixture.borrower).requestLoan(amount, { value: amount });
      return { ...fixture, amount, due: ethers.parseEther("0.055") };
    }

    it("repays a loan and returns collateral", async function () {
      const { pool, borrower, due, amount } = await activeLoan();

      await expect(() => pool.connect(borrower).repayLoan({ value: due }))
        .to.changeEtherBalance(borrower, -(due - amount));
      expect((await pool.loans(borrower.address)).active).to.equal(false);
    });

    it("rejects repayment below principal plus interest", async function () {
      const { pool, borrower, due } = await activeLoan();

      await expect(pool.connect(borrower).repayLoan({ value: due - 1n }))
        .to.be.revertedWithCustomError(pool, "InsufficientRepayment");
    });

    it("refunds excess repayment rather than retaining it in the pool", async function () {
      const { pool, borrower, due, amount } = await activeLoan();
      const before = await ethers.provider.getBalance(await pool.getAddress());

      await pool.connect(borrower).repayLoan({ value: due + ethers.parseEther("1") });

      expect(await ethers.provider.getBalance(await pool.getAddress()))
        .to.equal(before + due - amount);
    });
  });

  describe("liquidate", function () {
    async function activeLoan() {
      const fixture = await scoredBorrower();
      const amount = ethers.parseEther("0.05");
      await fixture.pool.connect(fixture.borrower).requestLoan(amount, { value: amount });
      return { ...fixture, amount };
    }

    it("keeps collateral in the pool and liquidates after dueBlock", async function () {
      const { pool, borrower, liquidator, amount } = await activeLoan();
      const before = await ethers.provider.getBalance(await pool.getAddress());
      await network.provider.send("hardhat_mine", ["0x34bc0"]);

      await expect(pool.connect(liquidator).liquidate(borrower.address))
        .to.emit(pool, "LoanLiquidated")
        .withArgs(borrower.address, amount, amount);

      expect((await pool.loans(borrower.address)).active).to.equal(false);
      expect(await ethers.provider.getBalance(await pool.getAddress())).to.equal(before);
    });

    it("rejects liquidation before dueBlock", async function () {
      const { pool, borrower, liquidator } = await activeLoan();

      await expect(pool.connect(liquidator).liquidate(borrower.address))
        .to.be.revertedWithCustomError(pool, "LoanNotDue");
    });

    it("rejects liquidation without an active loan", async function () {
      const { pool, borrower, liquidator } = await deployPool();

      await expect(pool.connect(liquidator).liquidate(borrower.address))
        .to.be.revertedWithCustomError(pool, "NoActiveLoan");
    });
  });

  describe("pool administration", function () {
    it("allows only the owner to withdraw pool ETH", async function () {
      const { pool, owner, other } = await deployPool();

      await expect(pool.connect(other).withdrawPool(1))
        .to.be.revertedWithCustomError(pool, "NotOwner");
      await expect(pool.connect(owner).withdrawPool(ethers.parseEther("1")))
        .to.emit(pool, "PoolWithdrawn")
        .withArgs(owner.address, ethers.parseEther("1"));
      expect(await ethers.provider.getBalance(await pool.getAddress()))
        .to.equal(ethers.parseEther("4"));
    });

    it("expires a score more than seven days after it is set", async function () {
      const { pool, borrower } = await scoredBorrower();
      await network.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
      await network.provider.send("evm_mine");

      await expect(pool.connect(borrower).requestLoan(ethers.parseEther("0.05"), {
        value: ethers.parseEther("0.05"),
      })).to.be.revertedWithCustomError(pool, "ScoreExpired");
    });

    it("blocks loan requests while paused and allows them after unpause", async function () {
      const { pool, owner, borrower } = await scoredBorrower();
      const amount = ethers.parseEther("0.05");

      await expect(pool.connect(owner).pause()).to.emit(pool, "PoolPaused");
      await expect(pool.connect(borrower).requestLoan(amount, { value: amount }))
        .to.be.revertedWithCustomError(pool, "Paused");
      await expect(pool.connect(owner).unpause()).to.emit(pool, "PoolUnpaused");
      await expect(pool.connect(borrower).requestLoan(amount, { value: amount }))
        .to.emit(pool, "LoanRequested");
    });

    it("allows only the owner to pause and unpause", async function () {
      const { pool, other } = await deployPool("0");

      await expect(pool.connect(other).pause()).to.be.revertedWithCustomError(pool, "NotOwner");
      await expect(pool.connect(other).unpause()).to.be.revertedWithCustomError(pool, "NotOwner");
    });
  });
});
