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
  <a href="https://www.korykaai.com/tools/pdf"><img src="https://img.shields.io/badge/demo-live-2563eb" alt="Live demo"></a>
</p>

<p align="center">
  <a href="https://www.korykaai.com/tools/pdf"><strong>Live demo</strong></a> ·
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
| [`@korykaai/pageink-core`](packages/core) | PDF export, text blocks, undo stack |
| [`@korykaai/pageink-web`](apps/web) | React demo app (Vite) |

## Quick start

```bash
git clone https://github.com/kory-kaai/pageink.git
cd pageink
npm install
npm run dev
```

Open `http://localhost:5173`.

## Deploy to Vercel

This repo is configured for Vercel at the root via [`vercel.json`](vercel.json):

- **Install:** `npm install`
- **Build:** core package, then the Vite web app
- **Output:** `apps/web/dist`
- **SPA rewrites:** all routes fall back to `index.html`

Connect the GitHub repo in Vercel and deploy. No environment variables are required.

For a custom domain such as `www.korykaai.com/tools/pdf`, point the path or subdomain to this Vercel project.

## Features

- Drag & drop PDF upload
- Click to add text, drag to move, resize handles
- Font family, size, color, bold
- Undo / redo
- Multi-page navigation
- Download edited PDF
- “Nothing uploaded” privacy badge

## Not in v1

- True rewrite of existing PDF text (glyph-level editing)
- OCR for scanned PDFs
- Server-side processing
- Merge / split / compress (link out instead)

## License

MIT © [Kory Kaai](https://www.korykaai.com)
