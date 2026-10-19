import type { FlowLayoutState, FlowScreenNode, PersistedNodeLayout } from "./types";

const COL_WIDTH = 420;
const ROW_HEIGHT = 520;

/** Auto-layout grid; merges with saved positions. */
export function computeNodePositions(
  nodes: FlowScreenNode[],
  saved: FlowLayoutState | null
): Record<string, PersistedNodeLayout> {
  const positions: Record<string, PersistedNodeLayout> = { ...(saved?.positions ?? {}) };

  const categories = ["auth", "join", "student", "coach", "admin", "internal", "redirect"] as const;
  const byCat = new Map<string, FlowScreenNode[]>();
  for (const c of categories) byCat.set(c, []);
  for (const n of nodes) {
    const list = byCat.get(n.category) ?? [];
    list.push(n);
    byCat.set(n.category, list);
  }

  let col = 0;
  for (const cat of categories) {
    const list = (byCat.get(cat) ?? []).sort((a, b) => a.route.localeCompare(b.route));
    let row = 0;
    for (const n of list) {
      if (positions[n.id]) continue;
      positions[n.id] = { x: col * COL_WIDTH, y: row * ROW_HEIGHT };
      row++;
    }
    if (list.length) col++;
  }

  return positions;
}

export function emptyLayout(): FlowLayoutState {
  return { version: 1, updatedAt: new Date().toISOString(), positions: {} };
}
