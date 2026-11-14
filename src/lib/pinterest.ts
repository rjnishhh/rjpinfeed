import { CATEGORIES, categorizePin, filenameFor } from "./categorize";
import type { Feed, FeedImage, FeedPin } from "./types";

const ORIGIN = "https://www.pinterest.com";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";

type Raw = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function bestImage(images: Raw | null | undefined): FeedImage | null {
  if (!images || typeof images !== "object") return null;
  const orig = images.orig as Raw | undefined;
  if (orig?.url && typeof orig.url === "string") {
    return { src: orig.url, width: num(orig.width), height: num(orig.height) };
  }
  let best: FeedImage | null = null;
  for (const value of Object.values(images)) {
    const img = value as Raw;
    if (!img || typeof img.url !== "string") continue;
    const width = num(img.width) ?? 0;
    if (!best || width > (best.width ?? 0)) {
      best = { src: img.url, width: num(img.width), height: num(img.height) };
    }
  }
  return best;
}

function carouselImages(pin: Raw): FeedImage[] {
  const carousel = pin.carousel_data as Raw | undefined;
  const slots = carousel?.carousel_slots as Raw[] | undefined;
  if (!Array.isArray(slots)) return [];
  return slots
    .map((slot) => bestImage(slot.images as Raw))
    .filter((x): x is FeedImage => Boolean(x));
}

function parsePin(pin: Raw): FeedPin | null {
  if (pin.type && pin.type !== "pin") return null;
  if (pin.is_promoted === true) return null;
  const id = str(pin.id);
  if (!id) return null;
  const title =
    str(pin.title) ||
    str(pin.grid_title) ||
    str(pin.closeup_unified_description)?.slice(0, 80) ||
    str(pin.alt_text)?.slice(0, 80) ||
    str(pin.auto_alt_text)?.slice(0, 80) ||
    "Untitled pin";
  const description =
    str(pin.closeup_unified_description) || str(pin.description);
  const board = (pin.board as Raw) || {};
  const pinner = ((pin.pinner as Raw) || (pin.native_creator as Raw) || {}) as Raw;
  const reactionsObj = (pin.reaction_counts as Record<string, number>) || {};
  const reactions = Object.values(reactionsObj).reduce((a, b) => a + (b || 0), 0);
  const main = bestImage(pin.images as Raw);
  const extras = carouselImages(pin);
  const images = (extras.length ? extras : main ? [main] : []).map((img) => ({
    ...img,
  }));
  if (!images.length) return null;
  const category = categorizePin({
    title,
    description,
    board: str(board.name),
    domain: str(pin.domain),
  });
  const pinOut: FeedPin = {
    id,
    url: `${ORIGIN}/pin/${id}/`,
    category,
    title,
    pinner: str(pinner.username) || "unknown",
    board: str(board.name) || "",
    reactions,
    note: null,
    description,
    images,
  };
  pinOut.images = pinOut.images.map((img, i) => {
    const path = new URL(img.src).pathname;
    const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")) : ".jpg";
    return {
      ...img,
      file: `${category}/${filenameFor(pinOut, i + 1, pinOut.images.length, ext)}`,
    };
  });
  return pinOut;
}

function walkPins(node: unknown, out: Raw[]) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const item of node) walkPins(item, out);
    return;
  }
  if (typeof node !== "object") return;
  const obj = node as Raw;
  if (obj.type === "pin" && obj.id) {
    out.push(obj);
    return;
  }
  for (const value of Object.values(obj)) walkPins(value, out);
}

export async function fetchHomeFeed(count = 20): Promise<Feed> {
  const session = process.env.PINTEREST_SESS;
  const csrf = process.env.PINTEREST_CSRF || "rjpinfeed";
  if (!session) {
    throw new Error("PINTEREST_SESS is not configured on the server");
  }

  const pins: FeedPin[] = [];
  let cursor: string | null = null;
  const seen = new Set<string>();

  while (pins.length < count) {
    const remaining = Math.min(50, count - pins.length);
    const options: Record<string, unknown> = {
      field_set_key: "hf_grid",
      in_nux: false,
      in_news_hub: false,
      static_feed: false,
      page_size: remaining,
    };
    if (cursor) options.bookmarks = [cursor];
    const data = JSON.stringify({ options, context: {} });
    const url = new URL(`${ORIGIN}/resource/UserHomefeedResource/get/`);
    url.searchParams.set("source_url", "/");
    url.searchParams.set("data", data);
    url.searchParams.set("_", String(Date.now()));

    const res = await fetch(url, {
      headers: {
        accept: "application/json, text/javascript, */*; q=0.01",
        "user-agent": UA,
        cookie: `_pinterest_sess=${session}; _auth=1; csrftoken=${csrf}`,
        "x-csrftoken": csrf,
        "x-requested-with": "XMLHttpRequest",
        "x-pinterest-appstate": "active",
        "x-pinterest-pws-handler": "www/[username].js",
        "x-pinterest-source-url": "/",
        referer: `${ORIGIN}/`,
      },
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`Pinterest returned HTTP ${res.status}`);
    }
    const body = (await res.json()) as Raw;
    const rr = (body.resource_response as Raw) || {};
    if (rr.status && rr.status !== "success") {
      const err = (rr.error as Raw) || {};
      throw new Error(str(err.message) || "Pinterest request failed");
    }
    const found: Raw[] = [];
    walkPins(rr.data, found);
    let added = 0;
    for (const raw of found) {
      const pin = parsePin(raw);
      if (!pin || seen.has(pin.id)) continue;
      seen.add(pin.id);
      pins.push(pin);
      added += 1;
      if (pins.length >= count) break;
    }
    const next = str(rr.bookmark);
    if (!next || next === "-end-" || next === cursor || added === 0) break;
    cursor = next;
  }

  const used = new Set(pins.map((p) => p.category));
  const categories = CATEGORIES.filter(
    (c) => used.has(c.name) || c.name !== "Fresh Finds" || used.has("Fresh Finds"),
  );

  const now = new Date();
  return {
    feed_date: now.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    updated_at: now.toISOString(),
    categories: categories.length ? categories : CATEGORIES.slice(0, 5),
    pins,
  };
}
