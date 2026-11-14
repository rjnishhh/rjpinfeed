# rj pin feed

A nostalgic corkboard scrapbook of my Pinterest home feed.

- Browse Polaroid-style cards by category
- **Check feed now** pulls the latest home feed from my signed-in Pinterest session and replaces the wall
- **Save to my computer** writes the same category folders (or a zip) to your machine

Live: [rjpinffed.vercel.app](https://rjpinffed.vercel.app)

## Local

```bash
npm install
npm run dev
```

## Environment (Vercel / local `.env.local`)

| Variable | Purpose |
| --- | --- |
| `PINTEREST_SESS` | Value of the `_pinterest_sess` cookie |
| `PINTEREST_CSRF` | Value of the `csrftoken` cookie |
| `FEED_REFRESH_SECRET` | Shared secret required to press Check feed now |
| `BLOB_READ_WRITE_TOKEN` | Optional Vercel Blob token so refreshed feeds persist for everyone |

Without Blob, a successful refresh still updates the open browser tab; a new visitor will see the seeded scrapbook until Blob is configured.
