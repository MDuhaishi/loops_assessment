# CatalogPilot

An AI tool that turns restaurant menus into platform-ready product listings — bilingual, structured, ready to export.

You upload a PDF menu, it extracts the products, you fill in anything missing (ingredients especially), and the LLM writes the title and description in Arabic and English. One product at a time, approve as you go, export when done.

Built for the Loops AI Engineer take-home.

---

## How it works

1. Drop a menu PDF into `/assets` (or upload it from the UI)
2. Hit Extract — it pulls out products automatically. Text-based PDFs take seconds. Image-based PDFs (Canva exports, scans) go through a vision model and take a few minutes
3. Go through each product in the sequential editor. Fill in anything blank — ingredients matter most, they make the descriptions specific instead of generic
4. Hit Generate — the LLM writes the listing. Refine it with a sentence if you want ("make it shorter", "more premium tone")
5. Approve and move to the next one
6. When you're done with a menu, export everything as JSON

---

## Structure

```
Loops/
├── client/        React + Vite + Tailwind — the UI
├── server/        Node + Express + TypeScript — the API
├── assets/        Drop your PDFs here
├── data/
│   ├── raw/       Cached page renders, auto-generated, safe to delete
│   └── processed/ The "database" — product records and extraction runs
└── .env           Config (create this yourself, see below)
```

The server runs on **3001**, the client on **5173**. Vite proxies API calls so there's no CORS to deal with.

---

## Prerequisites

- Node.js 18+
- [Ollama](https://ollama.com) running locally

Pull the two models:

```bash
ollama pull qwen2.5:7b-instruct
ollama pull qwen3.5:9b-q4_K_M
```

Create a vision model variant with a larger context window (the default 4096 is too small for menu page images):

```bash
printf 'FROM qwen3.5:9b-q4_K_M\nPARAMETER num_ctx 16384\n' > /tmp/Modelfile
ollama create qwen3.5-vision-16k -f /tmp/Modelfile
```

---

## Setup

Install dependencies:

```bash
npm install
cd server && npm install
cd ../client && npm install
```

Create a `.env` file in the root:

```env
OLLAMA_MODE=true
QWEN_TEXT_MODEL=qwen2.5:7b-instruct
QWEN_VISION_MODEL=qwen3.5-vision-16k
PORT=3001
NODE_ENV=development
```

---

## Running it

Two terminals:

```bash
# Terminal 1
cd server && npm run dev

# Terminal 2
cd client && npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## A few things worth knowing

**The first extraction is slow.** The vision model loads into memory on the first request. Expect 30–60 seconds for the first page, then it moves faster. There's a warm-up call built in — it's not frozen, just loading.

**Ingredients make a real difference.** If a product has ingredients, the generated description is specific. Without them it defaults to generic. The editor flags missing ingredients in amber so you know to fill them in before generating.

**Two extraction paths.** If the PDF has embedded text, it extracts in seconds via text parsing. If it's image-based, it falls back to the vision model automatically. You don't need to choose.

**The data is just JSON.** Everything lives in `data/processed/` as plain files. To start fresh: `echo '[]' > data/processed/restaurant_products.json`.

**No Ollama?** The app runs in demo mode with fixture data so you can still explore the UI.
