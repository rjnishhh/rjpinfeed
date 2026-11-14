import { put, list } from "@vercel/blob";
import seed from "../../data/seed.json";
import type { Feed } from "./types";

const BLOB_PATH = "rjpinfeed/latest-feed.json";

export function seedFeed(): Feed {
  return seed as Feed;
}

export async function readFeed(): Promise<Feed> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return seedFeed();
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    const hit = blobs.find((b) => b.pathname === BLOB_PATH) || blobs[0];
    if (!hit) return seedFeed();
    const res = await fetch(hit.url, { cache: "no-store" });
    if (!res.ok) return seedFeed();
    return (await res.json()) as Feed;
  } catch {
    return seedFeed();
  }
}

export async function writeFeed(feed: Feed): Promise<Feed> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return feed;
  await put(BLOB_PATH, JSON.stringify(feed, null, 2), {
    access: "public",
    contentType: "application/json",
    addRandomSuffix: false,
    allowOverwrite: true,
  });
  return feed;
}
