"use client";

import { createConfig, http } from "wagmi";
import { injected, coinbaseWallet } from "wagmi/connectors";
import { PUBLIC_NETWORK } from "@/lib/network";

export const wagmiConfig = createConfig({
  chains: [PUBLIC_NETWORK.chain],
  transports: { [PUBLIC_NETWORK.chain.id]: http(PUBLIC_NETWORK.browserRpcUrl) },
  connectors: [
    injected(),
    coinbaseWallet({ appName: "BaseCred" }),
  ],
  ssr: true,
});
