<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

<!-- AGENT-MEMORY:BEGIN -->
## Architecture
- The scan flow is three screens: `/scan` (camera) → `/scan/crop` (frame) → `/scan/$id` (result). The photo is handed between them through `src/lib/lipi/capture.ts`; scans persist on-device in IndexedDB via `src/lib/lipi/storage.ts`.
- Browser-only UI (camera, canvas, cropper) is gated behind `src/components/lipi/ClientOnly.tsx`, and any route that reads IndexedDB sets `ssr: false` and reads through its loader.
- OCR runs on-device with Tesseract.js (`src/lib/lipi/ocr.ts`, lazy-imported, one reused worker) and pronunciation comes from the local rule-based `src/lib/lipi/transliterate.ts`; the only AI call is the explicit Translate tap (`retranslate`). Why: the normal scan flow must not depend on AI credits.
- OCR settings are chosen by measurement only (`scripts/ocr-benchmark`, results in `docs/ocr-accuracy.md`): single-block page segmentation, upscale small crops, standard tesseract.js `kan`+`eng` data, no extra image filters or rotateAuto. Why: each alternative (Indic-OCR model, thresholding, sharpening, deskew) measured worse; re-run the benchmark before changing them.
- Read-aloud uses only the Web Speech API (`src/lib/lipi/speech.ts`), started synchronously from the tap for iOS. Why: no paid voice service; iOS blocks speech started after an await.
<!-- AGENT-MEMORY:END -->

