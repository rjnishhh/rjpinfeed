import { NextRequest, NextResponse } from "next/server";
import { writeFeed } from "@/lib/feed-store";
import { fetchHomeFeed } from "@/lib/pinterest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const secret = process.env.FEED_REFRESH_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "FEED_REFRESH_SECRET is not configured" },
      { status: 503 },
    );
  }
  const body = (await req.json().catch(() => ({}))) as { secret?: string; count?: number };
  if (body.secret !== secret) {
    return NextResponse.json({ error: "Wrong refresh secret" }, { status: 401 });
  }
  try {
    const count = Math.min(40, Math.max(5, Number(body.count) || 20));
    const feed = await fetchHomeFeed(count);
    await writeFeed(feed);
    return NextResponse.json(feed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Feed refresh failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
