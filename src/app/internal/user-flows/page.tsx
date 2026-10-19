import { UserFlowExplorer } from "@/components/user-flow-explorer/user-flow-explorer";
import { loadFlowGraph, loadFlowLayout } from "@/lib/user-flow-explorer/load-graph";
import { requireInternalToolAccess } from "@/lib/user-flow-explorer/require-internal-access";
import Link from "next/link";

export default async function UserFlowsPage() {
  await requireInternalToolAccess();
  const graph = loadFlowGraph();
  const layout = loadFlowLayout();

  if (!graph) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-bold">User Flow Explorer</h1>
        <p className="mt-4 text-sm text-white/60">
          Graph data not found. Generate it from the repository root:
        </p>
        <pre className="mt-4 rounded-lg bg-white/5 p-4 text-left text-xs">npm run user-flows:scan</pre>
        <Link href="/admin" className="mt-6 inline-block text-sm text-accent hover:underline">
          ← Back to admin
        </Link>
      </div>
    );
  }

  return <UserFlowExplorer graph={graph} initialLayout={layout} />;
}
