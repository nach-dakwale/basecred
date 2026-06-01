import { expect } from "chai";
import { ethers } from "hardhat";
import { loadFixture, time } from "@nomicfoundation/hardhat-network-helpers";

async function deployFixture() {
  const [owner, buyer, buyer2] = await ethers.getSigners();

  const Token = await ethers.getContractFactory("BaseCreditToken");
  const token = await Token.deploy(owner.address);

  const Sale = await ethers.getContractFactory("CredPrivateSale");
  const sale = await Sale.deploy(await token.getAddress());

  const now = await time.latest();
  const start = now + 100;
  const end = now + 100 + 7 * 24 * 3600;

  // 0.001 ETH per token (so 1 ETH buys 1000 tokens)
  const price = ethers.parseEther("0.001");
  const cap = ethers.parseEther("10");
  await sale.configureSale(price, cap, start, end);

  // Fund sale with 10M tokens
  await token.transfer(await sale.getAddress(), ethers.parseEther("10000000"));

  return { token, sale, owner, buyer, buyer2, start, end, price };
}

describe("CredPrivateSale", () => {
  it("buy reverts before sale starts", async () => {
    const { sale, buyer } = await loadFixture(deployFixture);
    await expect(sale.connect(buyer).buy({ value: ethers.parseEther("1") }))
      .to.be.revertedWithCustomError(sale, "SaleNotActive");
  });

  it("buy sends correct token amount", async () => {
    const { token, sale, buyer, start } = await loadFixture(deployFixture);
    await time.increaseTo(start);
    const saleAddr = await sale.getAddress();

    await sale.connect(buyer).buy({ value: ethers.parseEther("1") });
    // 1 ETH / 0.001 ETH per token = 1000 tokens
    expect(await token.balanceOf(buyer.address)).to.equal(ethers.parseEther("1000"));
  });

  it("buy reverts above hard cap", async () => {
    const { sale, buyer, start } = await loadFixture(deployFixture);
    await time.increaseTo(start);
    await expect(sale.connect(buyer).buy({ value: ethers.parseEther("11") }))
      .to.be.revertedWithCustomError(sale, "CapExceeded");
  });

  it("previewBuy returns correct amount", async () => {
    const { sale } = await loadFixture(deployFixture);
    const preview = await sale.previewBuy(ethers.parseEther("2"));
    expect(preview).to.equal(ethers.parseEther("2000"));
  });

  it("owner can withdraw raised ETH", async () => {
    const { sale, owner, buyer, start } = await loadFixture(deployFixture);
    await time.increaseTo(start);
    await sale.connect(buyer).buy({ value: ethers.parseEther("1") });

    const before = await ethers.provider.getBalance(owner.address);
    const tx = await sale.withdraw();
    const receipt = await tx.wait();
    const gasUsed = receipt!.gasUsed * receipt!.gasPrice;
    const after = await ethers.provider.getBalance(owner.address);
    expect(after - before + gasUsed).to.be.closeTo(ethers.parseEther("1"), ethers.parseEther("0.00001"));
  });

  it("recoverUnsoldTokens reverts before sale ends", async () => {
    const { sale } = await loadFixture(deployFixture);
    await expect(sale.recoverUnsoldTokens()).to.be.revertedWithCustomError(sale, "SaleNotEnded");
  });

  it("recoverUnsoldTokens sends tokens to owner after end", async () => {
    const { token, sale, owner, end } = await loadFixture(deployFixture);
    const saleAddr = await sale.getAddress();
    const saleBalance = await token.balanceOf(saleAddr);
    const ownerBefore = await token.balanceOf(owner.address);
    await time.increaseTo(end + 1);
    await sale.recoverUnsoldTokens();
    expect(await token.balanceOf(owner.address)).to.equal(ownerBefore + saleBalance);
    expect(await token.balanceOf(saleAddr)).to.equal(0n);
  });
});
