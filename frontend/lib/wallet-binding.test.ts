import { describe, expect, it } from "vitest";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { verifyMessage } from "viem";
import {
  bindingMessage,
  identityIdForGitHubUser,
  parseBindingRequest,
  type WalletBindingChallenge,
} from "@/lib/wallet-binding";

describe("wallet binding validation", () => {
  const identityId = identityIdForGitHubUser("12345");
  const account = privateKeyToAccount(generatePrivateKey());
  const challenge: WalletBindingChallenge = {
    wallet: account.address,
    identityId,
    nonce: `0x${"12".repeat(32)}`,
    expiresAt: 1100,
    chainId: 84532,
    contractAddress: "0x1111111111111111111111111111111111111111",
    networkName: "Base Sepolia Testnet",
  };

  it("verifies the owner signature for a bounded challenge", async () => {
    const message = bindingMessage(challenge);
    const signature = await account.signMessage({ message });
    expect(await verifyMessage({ address: account.address, message, signature })).toBe(true);
    const parsed = parseBindingRequest({ ...challenge, signature }, identityId, 84532, challenge.contractAddress, challenge.networkName, 1000);
    expect(parsed.challenge.wallet).toBe(account.address);
  });

  it("rejects expired and malformed proof challenges", async () => {
    const signature = await account.signMessage({ message: bindingMessage(challenge) });
    expect(() => parseBindingRequest({ ...challenge, signature }, identityId, 84532, challenge.contractAddress, challenge.networkName, 1101)).toThrow();
    expect(() => parseBindingRequest({ ...challenge, nonce: "0x12", signature }, identityId, 84532, challenge.contractAddress, challenge.networkName, 1000)).toThrow();
  });
});
