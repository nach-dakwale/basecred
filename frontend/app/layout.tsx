import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

const BASE_URL = "https://basecred-testnet.nachdakwale.workers.dev";

export const metadata: Metadata = {
  title: "BaseCred - Developer Credit on Base",
  description: "Undercollateralized ETH loans backed by your GitHub reputation",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "BaseCred - Developer Credit on Base",
    description: "Undercollateralized ETH loans on Base, credit-scored by GitHub reputation.",
    url: BASE_URL,
    siteName: "BaseCred",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BaseCred - Developer Credit on Base",
    description: "Undercollateralized ETH loans on Base, credit-scored by GitHub reputation.",
    images: ["/og.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
