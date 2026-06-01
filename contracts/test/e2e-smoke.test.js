const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time, mine } = require("@nomicfoundation/hardhat-network-helpers");

const ONE_DAY = 86400;
const FIVE_DAYS = 5 * ONE_DAY;
const TWO_DAYS = 2 * ONE_DAY;

describe("E2E smoke test", () => {
  it("runs the full protocol flow", async () => {
    const [deployer, oracle, owner, treasury, buyer1, buyer2, borrower] = await ethers.getSigners();

    // --- deploy ---
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

    // Fund pool liquidity
    await owner.sendTransaction({ to: await pool.getAddress(), value: ethers.parseEther("5") });

    // --- (b) sale setup ---
    const Sale = await ethers.getContractFactory("CredPrivateSale");
    const sale = await Sale.deploy(await token.getAddress());

    const saleAmount = ethers.parseEther("10000000"); // 10M tokens
    await token.transfer(await sale.getAddress(), saleAmount);

    const now = await time.latest();
    const pricePerToken = ethers.parseEther("0.0001"); // 0.0001 ETH / token
    const hardCap = ethers.parseEther("100"); // 100 ETH cap
    await sale.connect(deployer).configureSale(
      pricePerToken,
      hardCap,
      BigInt(now + 60),
      BigInt(now + 30 * ONE_DAY)
    );
    await time.increase(120);

    // --- (c) two buyers purchase ---
    const ethForBuyer1 = ethers.parseEther("0.1"); // 1000 tokens
    const ethForBuyer2 = ethers.parseEther("0.2"); // 2000 tokens

    await sale.connect(buyer1).buy({ value: ethForBuyer1 });
    await sale.connect(buyer2).buy({ value: ethForBuyer2 });

    expect(await token.balanceOf(buyer1.address)).to.equal(ethers.parseEther("1000"));
    expect(await token.balanceOf(buyer2.address)).to.equal(ethers.parseEther("2000"));

    // Self-delegate for voting power
    await token.connect(buyer1).delegate(buyer1.address);
    await token.connect(buyer2).delegate(buyer2.address);

    // --- (d) bind borrower identity ---
    const identityId = ethers.keccak256(ethers.toUtf8Bytes("borrower-gh-e2e"));
    const proofNonce = ethers.keccak256(ethers.toUtf8Bytes("nonce-e2e"));
    await pool.connect(oracle).setScoreAndBind(identityId, borrower.address, 650, proofNonce);
    expect(await pool.scores(identityId)).to.equal(650n);

    // --- (e) borrower takes a loan ---
    const loanAmount = ethers.parseEther("0.5");
    await pool.connect(borrower).requestLoan(loanAmount, { value: 0n });
    const loan = await pool.loans(identityId);
    expect(loan.active).to.be.true;
    expect(loan.amount).to.equal(loanAmount);

    // --- (f) repayment: 20% -> treasury, 80% -> dividends ---
    const interestBps = await pool.interestBps();
    const feeBps = await pool.protocolFeeBps();
    const interest = (loanAmount * interestBps) / 10000n;
    const protocolFee = (interest * feeBps) / 10000n;
    const holderShare = interest - protocolFee;

    const treasuryBefore = await ethers.provider.getBalance(treasury.address);
    const divBefore = await ethers.provider.getBalance(await dividends.getAddress());

    await pool.connect(borrower).repayLoan({ value: loanAmount + interest });

    expect(await ethers.provider.getBalance(treasury.address) - treasuryBefore).to.equal(protocolFee);
    expect(await ethers.provider.getBalance(await dividends.getAddress()) - divBefore).to.equal(holderShare);
    expect((await pool.loans(identityId)).active).to.be.false;

    // --- (g) both buyers claim dividends ---
    const totalSupply = await token.totalSupply();
    const b1Balance = await token.balanceOf(buyer1.address);
    const b2Balance = await token.balanceOf(buyer2.address);

    const expected1 = (holderShare * b1Balance) / totalSupply;
    const expected2 = (holderShare * b2Balance) / totalSupply;

    expect(await dividends.pendingReward(buyer1.address)).to.be.closeTo(expected1, 1n);
    expect(await dividends.pendingReward(buyer2.address)).to.be.closeTo(expected2, 1n);

    await dividends.connect(buyer1).claim();
    await dividends.connect(buyer2).claim();
    expect(await dividends.pendingReward(buyer1.address)).to.equal(0n);
    expect(await dividends.pendingReward(buyer2.address)).to.equal(0n);

    // --- (h-j) governance: deploy timelock + governor, create proposal, vote, execute ---
    const TimelockFactory = await ethers.getContractFactory("TimelockController");
    const timelock = await TimelockFactory.deploy(
      TWO_DAYS,
      [],
      [],
      deployer.address
    );

    const Governor = await ethers.getContractFactory("CredGovernor");
    const governor = await Governor.deploy(await token.getAddress(), await timelock.getAddress());

    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const ADMIN_ROLE = await timelock.DEFAULT_ADMIN_ROLE();
    await timelock.grantRole(PROPOSER_ROLE, await governor.getAddress());
    await timelock.grantRole(EXECUTOR_ROLE, await governor.getAddress());
    await timelock.renounceRole(ADMIN_ROLE, deployer.address);

    // Deploy a pool owned by timelock for governance testing
    const Pool2 = await ethers.getContractFactory("GitHubLoanPool");
    const pool2 = await Pool2.deploy(
      oracle.address,
      await timelock.getAddress(),
      ethers.parseEther("10"),
      treasury.address
    );
    expect(await pool2.owner()).to.equal(await timelock.getAddress());

    // Give buyer1 enough tokens to meet proposal threshold (100k) AND quorum (4% of 100M = 4M)
    await token.transfer(buyer1.address, ethers.parseEther("5000000"));
    await mine(2); // ensure checkpoint is recorded

    // Create proposal: setInterestBps(500)
    const setInterestData = pool2.interface.encodeFunctionData("setInterestBps", [500]);
    const description = "Set interest to 5%";

    const proposeTx = await governor.connect(buyer1).propose(
      [await pool2.getAddress()],
      [0n],
      [setInterestData],
      description
    );
    const proposeReceipt = await proposeTx.wait();
    const proposeEvent = proposeReceipt.logs.find(l => l.fragment?.name === "ProposalCreated");
    const proposalId = proposeEvent.args.proposalId;

    // Fast-forward past voting delay (1 day = 86400 blocks in OZ governor default clock)
    await mine(ONE_DAY + 1);

    // Vote in favor
    await governor.connect(buyer1).castVote(proposalId, 1);
    await governor.connect(buyer2).castVote(proposalId, 1);

    // Fast-forward past voting period (5 days = 432000 blocks)
    await mine(FIVE_DAYS + 1);

    // Queue — uses timelock (2-day min delay in seconds via timestamp)
    await governor.connect(buyer1).queue(
      [await pool2.getAddress()],
      [0n],
      [setInterestData],
      ethers.keccak256(ethers.toUtf8Bytes(description))
    );

    // Fast-forward past timelock delay (2 days in seconds)
    await time.increase(TWO_DAYS + 1);

    // Execute
    await governor.connect(buyer1).execute(
      [await pool2.getAddress()],
      [0n],
      [setInterestData],
      ethers.keccak256(ethers.toUtf8Bytes(description))
    );

    // Verify interestBps changed to 500
    expect(await pool2.interestBps()).to.equal(500n);
  });
});
