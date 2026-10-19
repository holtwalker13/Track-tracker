import { requireInternalToolAccess } from "@/lib/user-flow-explorer/require-internal-access";

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  await requireInternalToolAccess();
  return (
    <div className="min-h-screen bg-[#0a0a0b] text-foreground">
      <div className="border-b border-white/10 bg-black/40 px-4 py-2 text-xs uppercase tracking-widest text-accent">
        Internal · Track Tracker dev tools
      </div>
      {children}
    </div>
  );
}
