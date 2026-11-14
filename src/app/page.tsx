"use client";

import { useEffect, useMemo, useState } from "react";
import type { Feed, FeedPin } from "@/lib/types";
import { saveFeedLocally } from "@/lib/save-local";
import seed from "../../data/seed.json";

const SECRET_KEY = "rjpinfeed-refresh-secret";

export default function HomePage() {
  const [feed, setFeed] = useState<Feed>(seed as Feed);
  const [active, setActive] = useState("All");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [secret, setSecret] = useState("");
  const [needSecret, setNeedSecret] = useState(false);
  const [viewer, setViewer] = useState<{ pin: FeedPin; index: number } | null>(null);

  useEffect(() => {
    const saved = sessionStorage.getItem(SECRET_KEY);
    if (saved) setSecret(saved);
    fetch("/api/feed")
      .then((r) => r.json())
      .then((data: Feed) => setFeed(data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!viewer) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setViewer(null);
      if (e.key === "ArrowLeft") {
        setViewer((v) => (v && v.index > 0 ? { ...v, index: v.index - 1 } : v));
      }
      if (e.key === "ArrowRight") {
        setViewer((v) =>
          v && v.index < v.pin.images.length - 1 ? { ...v, index: v.index + 1 } : v,
        );
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [viewer]);

  const imageCount = useMemo(
    () => feed.pins.reduce((n, p) => n + p.images.length, 0),
    [feed],
  );

  async function checkFeed() {
    if (!secret) {
      setNeedSecret(true);
      setStatus("Enter your refresh secret, then press Check feed now again.");
      return;
    }
    setBusy(true);
    setStatus("Checking your Pinterest home feed…");
    try {
      sessionStorage.setItem(SECRET_KEY, secret);
      const res = await fetch("/api/check-feed", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ secret, count: 20 }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Refresh failed");
      setFeed(data as Feed);
      setActive("All");
      setStatus(
        `Replaced everything with ${data.pins.length} fresh pins · ${data.feed_date}`,
      );
      setNeedSecret(false);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Refresh failed");
      setNeedSecret(true);
    } finally {
      setBusy(false);
    }
  }

  async function saveLocal() {
    setBusy(true);
    setStatus("Saving the scrapbook to your computer…");
    try {
      const mode = await saveFeedLocally(feed, (message) => setStatus(message));
      setStatus(
        mode === "folder"
          ? "Saved as folders on your computer (same category layout)."
          : "Downloaded a zip with the same category layout.",
      );
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        setStatus("Save cancelled.");
      } else {
        setStatus(error instanceof Error ? error.message : "Could not save");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shell">
      <div className="scrapbook">
        <header className="masthead">
          <h1>rj pin feed</h1>
          <p className="subtitle">
            A corkboard scrapbook of my Pinterest home feed · {feed.feed_date}
            {feed.updated_at ? ` · refreshed ${new Date(feed.updated_at).toLocaleString()}` : ""}
          </p>
          <p className="subtitle">
            {feed.pins.length} pins · {imageCount} photos at original size
          </p>
        </header>

        <div className="toolbar">
          <button className="btn primary" disabled={busy} onClick={checkFeed}>
            Check feed now
          </button>
          <button className="btn" disabled={busy} onClick={saveLocal}>
            Save to my computer
          </button>
        </div>

        {needSecret && (
          <div className="secret-row">
            <input
              type="password"
              placeholder="Refresh secret"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              autoComplete="off"
            />
          </div>
        )}

        <p className="status" aria-live="polite">
          {status}
        </p>

        <nav className="filters" aria-label="Categories">
          <button
            className="chip"
            aria-pressed={active === "All"}
            onClick={() => setActive("All")}
          >
            All ({feed.pins.length})
          </button>
          {feed.categories.map((c) => {
            const count = feed.pins.filter((p) => p.category === c.name).length;
            if (!count) return null;
            return (
              <button
                key={c.name}
                className="chip"
                style={{ ["--c" as string]: c.color }}
                aria-pressed={active === c.name}
                onClick={() => setActive(c.name)}
              >
                <span className="dot" />
                {c.name} ({count})
              </button>
            );
          })}
        </nav>

        {feed.categories.map((category) => {
          if (active !== "All" && active !== category.name) return null;
          const pins = feed.pins.filter((p) => p.category === category.name);
          if (!pins.length) return null;
          return (
            <section className="section" key={category.name}>
              <h2>
                <span className="pushpin" style={{ ["--c" as string]: category.color }} />
                {category.name}
              </h2>
              <div className="wall">
                {pins.map((pin) => (
                  <button
                    key={pin.id}
                    className="polaroid"
                    style={{ ["--c" as string]: category.color }}
                    onClick={() => setViewer({ pin, index: 0 })}
                  >
                    <span className="tack" />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={pin.images[0].src}
                      alt={pin.title}
                      width={pin.images[0].width || undefined}
                      height={pin.images[0].height || undefined}
                      loading="lazy"
                    />
                    {pin.images.length > 1 && (
                      <span className="stack">{pin.images.length} photos</span>
                    )}
                    <div className="caption">{pin.title}</div>
                    <div className="meta">
                      @{pin.pinner}
                      {pin.board ? ` · ${pin.board}` : ""} · ♥ {pin.reactions}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}

        <p className="footer-note">
          Double-click a Polaroid in spirit — single click opens it. Check feed now replaces the
          whole wall from my live Pinterest session, then Save to my computer writes the same
          category folders onto your machine.
        </p>
      </div>

      {viewer && (
        <div className="viewer" onClick={() => setViewer(null)}>
          <div className="viewer-card" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={viewer.pin.images[viewer.index].src} alt={viewer.pin.title} />
            <div className="viewer-actions">
              <strong>{viewer.pin.title}</strong>
              <button
                className="btn"
                disabled={viewer.index === 0}
                onClick={() => setViewer({ ...viewer, index: viewer.index - 1 })}
              >
                ← Prev
              </button>
              <button
                className="btn"
                disabled={viewer.index >= viewer.pin.images.length - 1}
                onClick={() => setViewer({ ...viewer, index: viewer.index + 1 })}
              >
                Next →
              </button>
              <a className="btn" href={viewer.pin.url} target="_blank" rel="noreferrer">
                Pinterest ↗
              </a>
              <button className="btn danger" onClick={() => setViewer(null)}>
                Close
              </button>
            </div>
            <p className="meta" style={{ marginTop: 8 }}>
              {viewer.index + 1}/{viewer.pin.images.length}
              {viewer.pin.images[viewer.index].width
                ? ` · ${viewer.pin.images[viewer.index].width}×${viewer.pin.images[viewer.index].height}`
                : ""}{" "}
              · @{viewer.pin.pinner}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
