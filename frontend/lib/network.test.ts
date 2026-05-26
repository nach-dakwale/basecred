import { describe, expect, it } from "vitest";
import { base, baseSepolia } from "viem/chains";
import { createNetworkConfig } from "@/lib/network";

describe("network configuration", () => {
  it("selects Base Sepolia for the testnet artifact", () => {
    const config = createNetworkConfig({
      chainId: String(baseSepolia.id),
      contractAddress: "0x1111111111111111111111111111111111111111",
      explorerUrl: "https://sepolia.basescan.org",
    });
    expect(config.chain.id).toBe(baseSepolia.id);
    expect(config.isTestnet).toBe(true);
    expect(config.explorerUrl).toBe("https://sepolia.basescan.org");
  });

  it("selects Base mainnet independently", () => {
    const config = createNetworkConfig({
      chainId: String(base.id),
      contractAddress: "0x2222222222222222222222222222222222222222",
      explorerUrl: "https://basescan.org",
      browserRpcUrl: "https://rpc.example",
    });
    expect(config.chain.id).toBe(base.id);
    expect(config.isTestnet).toBe(false);
    expect(config.browserRpcUrl).toBe("https://rpc.example");
  });

  it("rejects an unsupported chain or missing deployment", () => {
    expect(() => createNetworkConfig({
      chainId: "1",
      contractAddress: "0x1111111111111111111111111111111111111111",
      explorerUrl: "https://example.com",
    })).toThrow();
    expect(() => createNetworkConfig({
      chainId: String(base.id),
      contractAddress: "0x0000000000000000000000000000000000000000",
      explorerUrl: "https://basescan.org",
    })).toThrow();
    expect(() => createNetworkConfig({
      chainId: String(base.id),
      contractAddress: "0x2222222222222222222222222222222222222222",
      explorerUrl: "https://basescan.org",
      browserRpcUrl: "https://mainnet.base.org",
    })).toThrow();
  });
});
