import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/session";

const SCREENSHOTS_ROOT = path.join(process.cwd(), "data/user-flow-explorer/screenshots");

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ path: string[] }> }
) {
  const session = await requireSession(["ADMIN"]);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { path: segments } = await ctx.params;
  const fileName = segments.join("/");
  if (!fileName.endsWith(".png") || fileName.includes("..")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const abs = path.join(SCREENSHOTS_ROOT, path.basename(fileName));
  if (!fs.existsSync(abs)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buf = fs.readFileSync(abs);
  return new NextResponse(buf, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
