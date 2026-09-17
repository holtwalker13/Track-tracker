import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth/session";

export async function GET(request: Request) {
  await destroySession();
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(new URL("/login", origin));
}
