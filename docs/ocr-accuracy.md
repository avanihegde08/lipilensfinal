# Kannada OCR accuracy (measured 18 Nov 2026)

Engine: Tesseract.js 7 in the browser, `kan` + `eng` 4.0.0_best_int language data (Apache-2.0), free CDN download, cached after first use.

## Test set — important caveat
The five photos tested earlier were not saved in the project, so they could not be re-used.
Instead, 5 Kannada sign texts (including "ಬಸ್ ನಿಲ್ದಾಣ / ತುಮಕೂರು" and "ಶ್ರೀ ಸೈ ಟ್ರಾವೆಲ್ಸ್" from the earlier test)
were rendered in 3 Noto Kannada fonts, at 2 text sizes, clean and with simulated photo damage
(uneven light, tilt up to ±6°, blur, noise, JPEG) = 30 images. These are synthetic: real street
photos are usually harder. Regenerate with `scripts/ocr-benchmark`.

CER = character edits / reference characters; WER = word edits / reference words (after NFC and whitespace normalisation).

## Engines and settings compared (mean CER over 30 images, Tesseract 5.5 CLI unless noted)
| Option | CER |
|---|---|
| tesseract.js default kan, auto layout (old app setting) | 0.300 |
| tessdata_fast kan, auto layout | 0.300 |
| tessdata_best kan (10 MB), auto layout | 0.302 |
| Indic-OCR kan (52 MB), auto layout | 0.598 |
| default kan, single text block (psm 6), upscaled | 0.131 |
| tessdata_best kan, psm 6, upscaled | 0.128 (3x download for ~0.3 pt gain, not used) |
| + grayscale/contrast stretch | 0.325 (worse) |
| + Otsu threshold | 0.175 (worse) |
| + Sauvola adaptive threshold | 0.51 (worse) |
| + median denoise | 0.236 (worse) |
| + unsharp sharpening (psm 3) | 0.444 (worse than 0.314) |
| best-of-3 variants by confidence | 0.127 (3x slower, not used) |
| tesseract.js rotateAuto deskew | 0.245 vs 0.153 without (worse, not used) |

## Before vs after, in the app's own code (tesseract.js, kan+eng)

Before (old settings): mean CER 0.330. After (shipped): mean CER 0.124, mean WER 0.233.

| Image | CER before | CER after | WER after | Output after |
|---|---|---|---|---|
| t1_bus__sans_clean_48 | 0.11 | 0.07 | 0.20 | ಬಸ್ ನಿಲಾಣ ತುಮಕೂರು 25 ಕಿ.ಮೀ |
| t1_bus__serif_clean_48 | 0.04 | 0.32 | 0.40 | ಬ್ ತುಮಕೂರು 25 ಕಿ.ಮೀ |
| t1_bus__uibold_sign_48 | 0.07 | 0.04 | 0.20 | ಬಸ್ ನಿಲ್ದಾಣ ತುಮಕೂರು 25 ತಿ.ಮೀ |
| t1_bus__sans_lowres_18 | 0.04 | 0.00 | 0.00 | ಬಸ್ ನಿಲ್ದಾಣ ತುಮಕೂರು 25 ಕಿ.ಮೀ |
| t1_bus__sans_photo_40 | 0.32 | 0.43 | 0.40 | ತುಮಕೂರು 25 ಕಿ.ಮೀ |
| t1_bus__serif_photo_hard_32 | 1.00 | 0.57 | 0.60 | ತುಮಕೂರು 25 ಕಿಮೀ... |
| t2_travels__sans_clean_48 | 1.00 | 0.03 | 0.17 | ಶ್ರೀ ಸೈ ಟ್ರಾವೆಲ್ಸ್ ಔೆಂಗಳೂರು - ಮೈಸೂರು |
| t2_travels__serif_clean_48 | 1.00 | 0.08 | 0.50 | ಶ್ರೀ ಸೃ ಟ್ರಾವಲ್ಸ್ ಜೆಂಗಳೂರು - ಮೈಸೂರು |
| t2_travels__uibold_sign_48 | 0.33 | 0.00 | 0.00 | ಶ್ರೀ ಸೈ ಟ್ರಾವೆಲ್ಸ್ ಬೆಂಗಳೂರು - ಮೈಸೂರು |
| t2_travels__sans_lowres_18 | 1.00 | 0.25 | 0.50 | ಟ್ರಾವೆಲ್ಸ್ ಬೆಂಗಳೂರು - ಹೈಸೂರು |
| t2_travels__sans_photo_40 | 0.22 | 0.11 | 0.33 | ಶ್ರೀಸ್ಟೆ ಟ್ರಾವೆಲ್ಸ್ ಬೆಂಗಳೂರು - ಮೈಸೂರು |
| t2_travels__serif_photo_hard_32 | 1.00 | 0.97 | 1.00 | ಭಯು |
| t3_ksrtc__sans_clean_48 | 0.00 | 0.00 | 0.00 | ಕರ್ನಾಟಕ ರಾಜ್ಯ ರಸ್ತೆ ಸಾರಿಗೆ ನಿಗಮ |
| t3_ksrtc__serif_clean_48 | 0.03 | 0.03 | 0.40 | ಕರ್ನಾಟಕ ರಾಜ್ಯರಸ್ತೆ ಸಾರಿಗೆ ನಿಗಮ |
| t3_ksrtc__uibold_sign_48 | 0.00 | 0.00 | 0.00 | ಕರ್ನಾಟಕ ರಾಜ್ಯ ರಸ್ತೆ ಸಾರಿಗೆ ನಿಗಮ |
| t3_ksrtc__sans_lowres_18 | 0.03 | 0.00 | 0.00 | ಕರ್ನಾಟಕ ರಾಜ್ಯ ರಸ್ತೆ ಸಾರಿಗೆ ನಿಗಮ |
| t3_ksrtc__sans_photo_40 | 0.00 | 0.06 | 0.20 | ಕರ್ನಾಟಕ ರಾಜ್ಯ ರಸ್ತೆ ಸಾರಿಗೆ ನಿಗಮ . |
| t3_ksrtc__serif_photo_hard_32 | 1.00 | 0.06 | 0.60 | ಕರ್ನಾಟಕ ರಾಜ್ಯರಸ್ತೆ ಸಾರಿಗೆ ನಿಗಮ. |
| t4_library__sans_clean_48 | 0.00 | 0.00 | 0.00 | ಸಾರ್ವಜನಿಕ ಗ್ರಂಥಾಲಯ ಬೆಳಿಗ್ಗೆ 9 ರಿಂದ ಸಂಜೆ 6 ರವರೆಗೆ |
| t4_library__serif_clean_48 | 0.04 | 0.00 | 0.00 | ಸಾರ್ವಜನಿಕ ಗ್ರಂಥಾಲಯ ಬೆಳಿಗ್ಗೆ 9 ರಿಂದ ಸಂಜೆ 6 ರವರೆಗೆ |
| t4_library__uibold_sign_48 | 0.00 | 0.00 | 0.00 | ಸಾರ್ವಜನಿಕ ಗ್ರಂಥಾಲಯ ಬೆಳಿಗ್ಗೆ 9 ರಿಂದ ಸಂಜೆ 6 ರವರೆಗೆ |
| t4_library__sans_lowres_18 | 0.17 | 0.00 | 0.00 | ಸಾರ್ವಜನಿಕ ಗ್ರಂಥಾಲಯ ಬೆಳಿಗ್ಗೆ 9 ರಿಂದ ಸಂಜೆ 6 ರವರೆಗೆ |
| t4_library__sans_photo_40 | 0.06 | 0.12 | 0.25 | ಪಸ ಸಸ ಸಾರ್ವಜನಿಕ ಗ್ರಂಥಾಲಯ ಬೆಳಿಗ್ಗೆ 9 ರಿಂದ ಸಂಜೆ 6 ರವರೆಗೆ |
| t4_library__serif_photo_hard_32 | 1.00 | 0.21 | 0.38 | ಸಾರ್ವಜನಿಕ . . ಬೆಳಿಗ್ಗೆ 9 ರಿಂದ ಸಂಜೆ 6 ರವರೆಗೆ . |
| t5_parking__sans_clean_48 | 0.03 | 0.00 | 0.00 | ದಯವಿಟ್ಟು ಇಲ್ಲಿ ವಾಹನ ನಿಲ್ಲಿಸಬೇಡಿ ಉಲ್ಲಂಘಿಸಿದರೆ ದಂಡ ವಿಧಿಸಲಾಗುವುದು |
| t5_parking__serif_clean_48 | 0.03 | 0.10 | 0.29 | ದಯವಿಟ್ಟು ಇಲ್ಲಿ ವಾಹನ ನಿಲ್ಜ್ದಿಸಬೇಡಿ ಉಲ್ಲಂಘಿಸಿದರೆ TOT ವಿಧಿಸಲಾಗುವುದು |
| t5_parking__uibold_sign_48 | 0.00 | 0.00 | 0.00 | ದಯವಿಟ್ಟು ಇಲ್ಲಿ ವಾಹನ ನಿಲ್ಲಿಸಬೇಡಿ ಉಲ್ಲಂಘಿಸಿದರೆ ದಂಡ ವಿಧಿಸಲಾಗುವುದು |
| t5_parking__sans_lowres_18 | 0.03 | 0.00 | 0.00 | ದಯವಿಟ್ಟು ಇಲ್ಲಿ ವಾಹನ ನಿಲ್ಲಿಸಬೇಡಿ ಉಲ್ಲಂಘಿಸಿದರೆ ದಂಡ ವಿಧಿಸಲಾಗುವುದು |
| t5_parking__sans_photo_40 | 0.34 | 0.21 | 0.29 | ದಯವಿಟ್ಟು ಇಲ್ಲಿ ವಾಹನ ನಿಲ್ಲಿಸಬೇಡಿ... ದಂಡ ವಿಧಿಸಲಾಗುವುದು |
| t5_parking__serif_photo_hard_32 | 1.00 | 0.03 | 0.29 | ದಯವಿಟ್ಟು ಇಲ್ಲಿ ವಾಹನ ನಿಲ್ಫಿಸಬೇಡಿ ಉಲ್ಲಂಘಿಸಿದರೆ ದಂಡ ವಿಧಿಸಲಾಗುವುದು. |

Per condition after: clean sans 0.020, clean serif 0.107, bold sign (light on dark) 0.007, small 18px text 0.050,
photo-like 0.188, hard photo (yellow on red, blurred, tilted) 0.370.

