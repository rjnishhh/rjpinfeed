import { NextResponse } from "next/server";
import { readFeed } from "@/lib/feed-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const feed = await readFeed();
  return NextResponse.json(feed);
}
