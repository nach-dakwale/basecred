export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const h = await headers();
  const authHeader = h.get("authorization") ?? "";
  const [, encoded] = authHeader.split(" ");
  const decoded = Buffer.from(encoded ?? "", "base64").toString();
  const colonIdx = decoded.indexOf(":");
  const pass = colonIdx >= 0 ? decoded.slice(colonIdx + 1) : "";

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword || pass !== adminPassword) {
    redirect("/admin/login");
  }

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
