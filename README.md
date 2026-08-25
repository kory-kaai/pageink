<p align="center">
  <strong>PageInk</strong>
</p>

<h1 align="center">Add text to any PDF in your browser</h1>

<p align="center">
  Private, open source, no upload. Open a PDF, click anywhere, type, move, resize, and download.
</p>

<p align="center">
  <a href="https://github.com/kory-kaai/pageink/actions/workflows/ci.yml"><img src="https://github.com/kory-kaai/pageink/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <a href="package.json"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen" alt="Node"></a>
  <a href="https://pageink.korykaai.com"><img src="https://img.shields.io/badge/demo-live-2563eb" alt="Live demo"></a>
</p>

<p align="center">
  <a href="https://pageink.korykaai.com"><strong>Live demo</strong></a> ·
  <a href="#quick-start"><strong>Quick start</strong></a> ·
  <a href="#why-pageink"><strong>Why PageInk?</strong></a> ·
  <a href="packages/core"><strong>Core package</strong></a>
</p>

---

## Why PageInk?

Most browser PDF tools are either:

- **Swiss Army knives** with dozens of features and a weak text editor, or
- **Upload-your-file services** that break the privacy promise

PageInk does one workflow exceptionally well:

**Open a PDF → click anywhere → type → move/resize → download**

Everything runs in the browser. Files never leave the device.

## Monorepo

| Package | Purpose |
| --- | --- |
| [`@korykaai/pageink-core`](packages/core) | Annotation types, coords, PDF export via pdf-lib |
| [`@korykaai/pageink-web`](apps/web) | Next.js app at [pageink.korykaai.com](https://pageink.korykaai.com) |

## Quick start

```bash
git clone https://github.com/kory-kaai/pageink.git
cd pageink
npm install
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

The Next.js app lives in `apps/web`. In Vercel:

1. Import `kory-kaai/pageink` from GitHub
2. Set **Root Directory** to `apps/web`
3. Deploy — [`apps/web/vercel.json`](apps/web/vercel.json) installs from the monorepo root, builds core, then runs `next build`

No environment variables are required.

## Features

- Drag & drop PDF upload
- Edit existing PDF text (text-layer PDFs) with whiteout + redraw
- Click to add new text, drag to move
- Font family, size, color, bold
- Undo / redo
- Multi-page navigation
- Download edited PDF
- “Nothing uploaded” privacy badge

## Not in v1

- True paragraph reflow (Word-style editing)
- OCR for scanned PDFs (no text layer)
- Server-side processing
- Merge / split / compress (link out instead)

## License

MIT © [Kory Kaai](https://www.korykaai.com)
