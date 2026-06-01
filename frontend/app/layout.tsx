import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

const BASE_URL = "https://basecred-testnet.nachdakwale.workers.dev";

export const metadata: Metadata = {
  title: "BaseCred - Developer Credit on Base",
  description: "ETH loan terms based on public GitHub history",
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: "BaseCred - Developer Credit on Base",
    description: "ETH loan terms on Base, based on public GitHub history.",
    url: BASE_URL,
    siteName: "BaseCred",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BaseCred - Developer Credit on Base",
    description: "ETH loan terms on Base, based on public GitHub history.",
    images: ["/og.png"],
  },
  other: {
    "talentapp:project_verification": "164960bb1427f6cea3620f90cef5001aba886acb7262a548106b451e80cf2dddaccb2e9b1f2d062503b0984f31fba80967d2c682a2892a09600c89378e203c47",
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
