import Link from "next/link";
import type { ReactNode } from "react";

const NAV_LINKS = [
  { label: "Dividends", href: "/dividends" },
  { label: "Govern", href: "/govern" },
  { label: "Token Sale", href: "/sale" },
];

interface SiteNavProps {
  activePath?: string;
  right?: ReactNode;
}

export function SiteNav({ activePath, right }: SiteNavProps) {
  const isDapp = activePath === "/dapp";

  return (
    <header className="border-b border-[#30363D] px-6 py-4 flex items-center justify-between">
      <Link href="/" className="font-semibold text-sm tracking-tight text-white">BaseCred</Link>
      <nav className="flex items-center gap-5">
        {NAV_LINKS.map(({ label, href }) => (
          <Link
            key={href}
            href={href}
            className={`text-sm transition-colors ${activePath === href ? "text-white" : "text-[#8B949E] hover:text-white"}`}
          >
            {label}
          </Link>
        ))}
        {isDapp ? (
          <Link href="/dapp" className="text-sm text-white">Launch App</Link>
        ) : (
          <Link
            href="/dapp"
            className="rounded-md bg-[#238636] border border-[#2EA043] px-3.5 py-1.5 text-sm font-medium text-white hover:bg-[#2EA043] transition-colors"
          >
            Launch App
          </Link>
        )}
        {right}
      </nav>
    </header>
  );
}
