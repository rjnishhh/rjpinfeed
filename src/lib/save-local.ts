import JSZip from "jszip";
import type { Feed, FeedPin } from "./types";

async function blobFor(src: string): Promise<{ blob: Blob; ext: string }> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`Could not download ${src}`);
  const blob = await res.blob();
  const path = src.split("?")[0];
  const ext = path.includes(".") ? path.slice(path.lastIndexOf(".")) : ".jpg";
  return { blob, ext };
}

function fileName(pin: FeedPin, index: number): string {
  return pin.images[index]?.file?.split("/").pop() || `${pin.title}.jpg`;
}

/** Prefer writing a real folder tree; fall back to a zip download. */
export async function saveFeedLocally(
  feed: Feed,
  onProgress?: (message: string) => void,
): Promise<"folder" | "zip"> {
  const w = window as Window &
    typeof globalThis & {
      showDirectoryPicker?: (opts?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
    };

  if (typeof w.showDirectoryPicker === "function") {
    try {
      const root = await w.showDirectoryPicker({ mode: "readwrite" });
      const stamp = feed.feed_date.replace(/\s+/g, "-");
      const base = await root.getDirectoryHandle(`Pinterest-Home-Feed-${stamp}`, {
        create: true,
      });
      for (const category of feed.categories) {
        const pins = feed.pins.filter((p) => p.category === category.name);
        if (!pins.length) continue;
        const catDir = await base.getDirectoryHandle(category.name, { create: true });
        for (const pin of pins) {
          onProgress?.(`Saving ${pin.title}`);
          for (let i = 0; i < pin.images.length; i++) {
            const { blob } = await blobFor(pin.images[i].src);
            const handle = await catDir.getFileHandle(fileName(pin, i), { create: true });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
          }
        }
      }
      const index = await base.getFileHandle("INDEX.md", { create: true });
      const writable = await index.createWritable();
      await writable.write(buildIndex(feed));
      await writable.close();
      return "folder";
    } catch (error) {
      if ((error as Error).name === "AbortError") throw error;
      // Fall through to zip if the picker is unsupported mid-flight.
    }
  }

  onProgress?.("Building zip…");
  const zip = new JSZip();
  for (const pin of feed.pins) {
    onProgress?.(`Packing ${pin.title}`);
    for (let i = 0; i < pin.images.length; i++) {
      const { blob } = await blobFor(pin.images[i].src);
      const path = pin.images[i].file || `${pin.category}/${fileName(pin, i)}`;
      zip.file(path, blob);
    }
  }
  zip.file("INDEX.md", buildIndex(feed));
  const content = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Pinterest-Home-Feed-${feed.feed_date.replace(/\s+/g, "-")}.zip`;
  a.click();
  URL.revokeObjectURL(url);
  return "zip";
}

function buildIndex(feed: Feed) {
  const lines = [`# Pinterest home feed — ${feed.feed_date}`, ""];
  for (const category of feed.categories) {
    const pins = feed.pins.filter((p) => p.category === category.name);
    if (!pins.length) continue;
    lines.push(`## ${category.name}`);
    for (const pin of pins) {
      lines.push(`- ${pin.title} — ${pin.url}`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
