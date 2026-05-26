import { getAddress, zeroAddress } from "viem";
import { base, baseSepolia, type Chain } from "viem/chains";

export interface NetworkConfig {
  chain: Chain;
  contractAddress: `0x${string}`;
  explorerUrl: string;
  name: string;
  browserRpcUrl?: string;
  isTestnet: boolean;
}

interface PublicEnvironment {
  chainId?: string;
  contractAddress?: string;
  explorerUrl?: string;
  name?: string;
  browserRpcUrl?: string;
}

export function createNetworkConfig(environment: PublicEnvironment): NetworkConfig {
  const chainId = Number(environment.chainId);
  const chain = chainId === base.id ? base : chainId === baseSepolia.id ? baseSepolia : undefined;
  if (!chain) throw new Error("NEXT_PUBLIC_CHAIN_ID must be 8453 or 84532");
  if (!environment.contractAddress) throw new Error("NEXT_PUBLIC_CONTRACT_ADDRESS is required");
  const contractAddress = getAddress(environment.contractAddress);
  if (contractAddress === zeroAddress) throw new Error("Contract address must not be zero");
  if (!environment.explorerUrl) throw new Error("NEXT_PUBLIC_EXPLORER_URL is required");
  const explorerUrl = new URL(environment.explorerUrl).toString().replace(/\/$/, "");
  const defaultName = chainId === baseSepolia.id ? "Base Sepolia Testnet" : "Base Mainnet";
  if (chainId === base.id && (!environment.browserRpcUrl || environment.browserRpcUrl.includes("mainnet.base.org"))) {
    throw new Error("Mainnet requires a configured production browser RPC endpoint");
  }
  return {
    chain,
    contractAddress,
    explorerUrl,
    name: environment.name || defaultName,
    browserRpcUrl: environment.browserRpcUrl,
    isTestnet: chainId === baseSepolia.id,
  };
}

export const PUBLIC_NETWORK = createNetworkConfig({
  chainId: process.env.NEXT_PUBLIC_CHAIN_ID,
  contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
  explorerUrl: process.env.NEXT_PUBLIC_EXPLORER_URL,
  name: process.env.NEXT_PUBLIC_NETWORK_NAME,
  browserRpcUrl: process.env.NEXT_PUBLIC_RPC_URL,
});

export function serverRpcUrl(): string {
  const rpcUrl = process.env.RPC_URL;
  if (!rpcUrl) throw new Error("RPC_URL is not configured");
  if (!PUBLIC_NETWORK.isTestnet && rpcUrl.includes("mainnet.base.org")) {
    throw new Error("Mainnet requires a configured production server RPC endpoint");
  }
  return rpcUrl;
}
