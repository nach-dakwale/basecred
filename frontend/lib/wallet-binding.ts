import { getAddress, isHex, keccak256, stringToHex, type Hex } from "viem";

export const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export interface WalletBindingChallenge {
  wallet: `0x${string}`;
  identityId: Hex;
  nonce: Hex;
  expiresAt: number;
  chainId: number;
  contractAddress: `0x${string}`;
  networkName: string;
}

export function identityIdForGitHubUser(githubId: string): Hex {
  if (!/^[0-9]+$/.test(githubId)) throw new Error("Invalid GitHub identity");
  return keccak256(stringToHex(`github:${githubId}`));
}

export function bindingMessage(challenge: WalletBindingChallenge): string {
  return [
    "BaseCred Wallet Binding",
    `Network: ${challenge.networkName} (${challenge.chainId})`,
    `Contract: ${challenge.contractAddress}`,
    `GitHub Identity: ${challenge.identityId}`,
    `Wallet: ${challenge.wallet}`,
    `Nonce: ${challenge.nonce}`,
    `Expires At: ${challenge.expiresAt}`,
    "Authorize this wallet for your BaseCred credit identity.",
  ].join("\n");
}

export function parseBindingRequest(
  value: unknown,
  identityId: Hex,
  chainId: number,
  contractAddress: `0x${string}`,
  networkName: string,
  now = Date.now(),
): { challenge: WalletBindingChallenge; signature: Hex } {
  const input = value as Record<string, unknown> | null;
  if (!input || typeof input.wallet !== "string" || typeof input.signature !== "string") {
    throw new Error("Wallet and signature are required");
  }
  if (typeof input.nonce !== "string" || !isHex(input.nonce) || input.nonce.length !== 66) {
    throw new Error("Invalid challenge nonce");
  }
  if (typeof input.expiresAt !== "number" || !Number.isSafeInteger(input.expiresAt)) {
    throw new Error("Invalid challenge expiration");
  }
  if (input.expiresAt <= now || input.expiresAt > now + CHALLENGE_TTL_MS) {
    throw new Error("Challenge expired or outside allowed lifetime");
  }
  if (!isHex(input.signature)) throw new Error("Invalid wallet signature");
  return {
    challenge: {
      wallet: getAddress(input.wallet),
      identityId,
      nonce: input.nonce,
      expiresAt: input.expiresAt,
      chainId,
      contractAddress,
      networkName,
    },
    signature: input.signature,
  };
}
