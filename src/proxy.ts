import { NextResponse } from "next/server";
import { getFrontendMode } from "./features/backend/frontend-mode";

// Page-level notFound can stream a 200 after the loading shell. Keep this
// absent operator surface a real 404 before rendering begins.
export function proxy() {
  if (getFrontendMode() !== "live" || process.env.LIVE_INSTANCE_UI !== "true") {
    return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.next();
}

export const config = { matcher: "/instances/:path*" };
