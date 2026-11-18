"""Lipi Lens scene-text OCR server (free, self-hosted, no paid APIs).

Wraps IndicPhotoOCR (MIT, IIT Jodhpur): TextBPN++ finds text regions, a ViT model decides
Kannada vs English for each word, and PARSeq reads it. All models load once at start-up.
"""
import io
import os
import tempfile
import threading
import time

import numpy as np
import torch
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps

from IndicPhotoOCR.ocr import OCR

MAX_BYTES = 8 * 1024 * 1024
MAX_EDGE = int(os.environ.get("LIPI_MAX_EDGE", "1600"))
torch.set_num_threads(int(os.environ.get("LIPI_THREADS", str(os.cpu_count() or 2))))

app = FastAPI(title="Lipi Lens OCR")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["GET", "POST"], allow_headers=["*"])

_lock = threading.Lock()  # one image at a time: keeps memory flat on a small free CPU box
_ocr: OCR | None = None
_ready = threading.Event()


def _load():
    global _ocr
    ocr = OCR(device="cpu", identifier_lang="kannada", verbose=False)
    # Warm every model once so the first real request is not slow.
    blank = Image.new("RGB", (160, 48), "white")
    with tempfile.NamedTemporaryFile(suffix=".jpg") as f:
        blank.save(f.name)
        ocr.identifier.identify(f.name, "kannada", -1)
        for lang in ("kannada", "english"):
            ocr.recogniser.recognise(lang, f.name, lang, False, torch.device("cpu"))
    _ocr = ocr
    _ready.set()


threading.Thread(target=_load, daemon=True).start()


def group_lines(words):
    """Groups word boxes into lines (top to bottom), each line read left to right."""
    words = sorted(words, key=lambda w: (w["bbox"][1] + w["bbox"][3]) / 2)
    lines = []
    for w in words:
        cy = (w["bbox"][1] + w["bbox"][3]) / 2
        h = w["bbox"][3] - w["bbox"][1]
        for line in lines:
            if abs(cy - line["cy"]) < 0.5 * max(h, line["h"]):
                line["words"].append(w)
                n = len(line["words"])
                line["cy"] = (line["cy"] * (n - 1) + cy) / n
                line["h"] = max(line["h"], h)
                break
        else:
            lines.append({"cy": cy, "h": h, "words": [w]})
    out = []
    for line in lines:
        ws = sorted(line["words"], key=lambda w: w["bbox"][0])
        out.append({"words": ws})
    return out


@app.get("/")
def health():
    return {"ok": True, "ready": _ready.is_set(), "engine": "IndicPhotoOCR"}


@app.post("/ocr")
async def ocr(image: UploadFile = File(...)):
    data = await image.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(413, "Image is larger than 8 MB.")
    try:
        img = ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")
    except Exception:
        raise HTTPException(415, "This file is not a supported image.")
    if not _ready.wait(timeout=240):
        raise HTTPException(503, "The reader is still starting. Try again in a minute.")
    scale = min(1.0, MAX_EDGE / max(img.size))
    if scale < 1:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)

    t0 = time.time()
    with _lock, tempfile.TemporaryDirectory() as tmp:
        path = os.path.join(tmp, "in.jpg")
        img.save(path, quality=95)
        boxes = _ocr.detect(path)
        bgr = np.asarray(img)[:, :, ::-1].copy()
        crops = []
        for box in boxes:
            pts = np.array(box)
            x1, y1 = pts.min(axis=0).tolist()
            x2, y2 = pts.max(axis=0).tolist()
            if (x2 - x1) < 6 or (y2 - y1) < 6:
                continue
            crop = _ocr.crop_bbox(bgr, box)
            if crop:
                crops.append((crop, [int(x1), int(y1), int(x2), int(y2)]))
        words = []
        if crops:
            paths = [c[0] for c in crops]
            scripts = _ocr.identifier.identify_batch(paths, "kannada", -1, batch_size=16)
            groups = {}
            for i, s in enumerate(scripts):
                # Lipi Lens reads Kannada signs: anything not English is read as Kannada.
                groups.setdefault("english" if s == "english" else "kannada", []).append(i)
            for lang, idx in groups.items():
                res = _ocr.recogniser.recognise_batch(
                    lang, [paths[i] for i in idx], lang, False, torch.device("cpu"), return_confidence=True, batch_size=16
                )
                for i, (text, conf) in zip(idx, res):
                    text = (text or "").strip()
                    if text:
                        words.append({"text": text, "confidence": round(float(conf), 3), "language": "en" if lang == "english" else "kn", "bbox": crops[i][1]})
            for p in paths:
                try:
                    os.remove(p)
                except OSError:
                    pass
    return {"engine": "IndicPhotoOCR", "ms": round((time.time() - t0) * 1000), "width": img.width, "height": img.height, "lines": group_lines(words)}
