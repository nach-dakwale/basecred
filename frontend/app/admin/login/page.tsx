export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-8 max-w-sm w-full text-center">
        <h1 className="text-lg font-semibold text-white mb-2">401 Unauthorized</h1>
        <p className="text-sm text-zinc-500">
          Valid credentials are required to access the admin panel.
        </p>
      </div>
    </div>
  );
}
