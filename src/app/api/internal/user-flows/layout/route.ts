import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";
import { loadFlowLayout, saveFlowLayout, LAYOUT_PATH } from "@/lib/user-flow-explorer/load-graph";
import type { FlowLayoutState } from "@/lib/user-flow-explorer/types";
import fs from "node:fs";

export async function GET() {
  const session = await requireSession(["ADMIN"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const layout = loadFlowLayout();
  return NextResponse.json(layout ?? { version: 1, updatedAt: null, positions: {} });
}

export async function POST(req: Request) {
  const session = await requireSession(["ADMIN"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: FlowLayoutState;
  try {
    body = (await req.json()) as FlowLayoutState;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.version !== 1 || typeof body.positions !== "object") {
    return NextResponse.json({ error: "Invalid layout shape" }, { status: 400 });
  }

  const layout: FlowLayoutState = {
    version: 1,
    updatedAt: new Date().toISOString(),
    positions: body.positions,
  };
  saveFlowLayout(layout);
  return NextResponse.json({ ok: true, path: LAYOUT_PATH.replace(process.cwd(), "") });
}

export async function DELETE() {
  const session = await requireSession(["ADMIN"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (fs.existsSync(LAYOUT_PATH)) fs.unlinkSync(LAYOUT_PATH);
  return NextResponse.json({ ok: true });
}
