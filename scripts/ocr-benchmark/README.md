Kannada OCR benchmark (dev only, not shipped). Results: docs/ocr-accuracy.md.
1. `python3 gen.py` (needs Pillow with raqm + Noto Kannada fonts) creates img/ and gt.json.
2. `python3 prep.py` creates the upscaled pre_none/ folder (plus filter variants).
3. `bun bench.ts pre_none norot 6` scores the app's own OCR code (shipped settings); `bun bench.ts img norot 3` scores the old settings.
`run.py` compares models/settings with the Tesseract CLI (`python3 run.py <model-dir> <img-dir> <psm> 1 [lang]`).
