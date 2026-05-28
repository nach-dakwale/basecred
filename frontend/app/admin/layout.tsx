export const dynamic = "force-dynamic";

import Link from "next/link";

// Auth is handled by middleware.ts — no check needed here.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center gap-6">
        <Link href="/" className="font-semibold text-sm tracking-tight text-white">
          BaseCred
        </Link>
        <nav className="flex items-center gap-4 text-xs text-zinc-400">
          <Link href="/admin" className="hover:text-zinc-100 transition-colors">
            Overview
          </Link>
          <Link href="/admin/loans" className="hover:text-zinc-100 transition-colors">
            Loans
          </Link>
          <Link href="/admin/identities" className="hover:text-zinc-100 transition-colors">
            Identities
          </Link>
        </nav>
        <span className="ml-auto text-xs text-zinc-600">Admin</span>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
