#!/usr/bin/env python3
"""
Analyze book images: OCR + auto-classification + keyword extraction.

Usage:
    python tools/analyze-images.py <image-dir> [--output-dir <dir>] [--lang eng|chi_sim]

Generates a `.meta.json` sidecar for each PNG, containing:
    - description:   auto-generated from OCR content
    - ocr_text:      full text extracted by tesseract
    - category:      one of [template, example, process, comparison, diagram, decorative]
    - keywords:      3-5 keywords extracted from OCR text
    - width, height: image dimensions
    - file_size:     bytes

Categories are inferred heuristically from OCR content:
    template    -> contains "canvas", "template", "map", "framework", "profile"
    example     -> contains specific company names, case studies, "e.g.", "example"
    process     -> contains step numbers (1. 2. 3.), arrows, flow labels
    comparison  -> contains tables, vs, columns, two-sided layout
    diagram     -> conceptual models with labels and connections
    decorative  -> very little text (<30 chars) or mostly illustration
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow is required. Install: pip install Pillow")
    sys.exit(1)

try:
    import pytesseract
except ImportError:
    print("Error: pytesseract is required. Install: pip install pytesseract")
    sys.exit(1)


# Heuristic keywords for auto-classification
CATEGORY_HINTS = {
    "template": ["canvas", "template", "map", "framework", "profile", "blank", "poster", "worksheet"],
    "example": ["example", "case study", "e.g.", "apple", "google", "amazon", "nike", "starbucks", "itunes", "skype"],
    "process": ["step", "process", "stage", "phase", "test", "design", "iterate", "prototype", "interview"],
    "comparison": ["vs", "versus", "compare", "continuum", "spectrum", "left", "right", "similar", "different"],
    "diagram": ["model", "diagram", "structure", "relationship", "connection", "link", "fit"],
}


def classify_image(ocr_text: str, img_width: int, img_height: int, file_size: int) -> str:
    """Classify an image based on OCR content and physical properties."""
    text_lower = ocr_text.lower()
    text_len = len(ocr_text.strip())

    # Very little text -> likely decorative
    if text_len < 30:
        return "decorative"

    # Very small images are likely icons/decorative
    if img_width < 200 or img_height < 200:
        return "decorative"

    scores = {}
    for category, hints in CATEGORY_HINTS.items():
        score = sum(1 for h in hints if h in text_lower)
        scores[category] = score

    # Check for explicit step numbers (strong process signal)
    if re.search(r"\b(step\s+\d|phase\s+\d|stage\s+\d|\d+\s*\.\s*\w+)", text_lower):
        scores["process"] = scores.get("process", 0) + 2

    # Check for template/canvas signals (strong template signal)
    if re.search(r"\b(canvas|template|map)\b", text_lower):
        scores["template"] = scores.get("template", 0) + 3

    # Check for comparison/contrast signals
    if re.search(r"\b(vs|versus|compare|contrast|left/right|explore/exploit)\b", text_lower):
        scores["comparison"] = scores.get("comparison", 0) + 2

    best = max(scores, key=scores.get, default="diagram")
    if scores.get(best, 0) > 0:
        return best

    # Fallback: lots of text + structured -> diagram; scattered text -> decorative
    if text_len > 200 and (img_width > 600 or img_height > 400):
        return "diagram"

    return "decorative"


def extract_keywords(ocr_text: str, category: str, max_keywords: int = 5) -> list:
    """Extract keywords from OCR text using simple frequency heuristics."""
    text = ocr_text.lower()
    # Remove common stop words
    stop_words = {
        "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
        "have", "has", "had", "do", "does", "did", "will", "would", "could",
        "should", "may", "might", "must", "shall", "can", "need", "dare",
        "ought", "used", "to", "of", "in", "for", "on", "with", "at", "by",
        "from", "as", "into", "through", "during", "before", "after", "above",
        "below", "between", "under", "and", "but", "or", "yet", "so", "if",
        "because", "although", "though", "while", "where", "when", "that",
        "which", "who", "whom", "whose", "what", "this", "these", "those",
        "i", "you", "he", "she", "it", "we", "they", "me", "him", "her",
        "us", "them", "my", "your", "his", "its", "our", "their", "mine",
        "yours", "hers", "ours", "theirs", "one", "ones", "all", "some",
        "any", "each", "every", "both", "few", "more", "most", "other",
        "such", "no", "not", "only", "own", "same", "than", "too", "very",
    }

    # Extract words (2+ chars, alphabetic or hyphenated)
    words = re.findall(r"[a-zA-Z][a-zA-Z\-]{1,}", text)
    words = [w for w in words if w not in stop_words and len(w) > 2]

    # Frequency count
    freq = {}
    for w in words:
        freq[w] = freq.get(w, 0) + 1

    # Boost category-specific terms
    category_boost = {
        "template": ["canvas", "template", "map", "framework", "profile"],
        "example": ["example", "case", "company", "business"],
        "process": ["test", "design", "iterate", "prototype", "interview"],
        "comparison": ["compare", "contrast", "versus", "risk", "return"],
        "diagram": ["model", "structure", "relationship", "value"],
    }
    for term in category_boost.get(category, []):
        if term in freq:
            freq[term] += 3

    # Pick top keywords
    sorted_words = sorted(freq.items(), key=lambda x: -x[1])
    keywords = [w for w, _ in sorted_words[:max_keywords]]
    return keywords


def generate_description(ocr_text: str, category: str, img_width: int, img_height: int) -> str:
    """Generate a short description from OCR content."""
    text = ocr_text.strip()
    if not text:
        return f"A {category} illustration ({img_width}x{img_height})."

    # Take first ~150 chars as preview
    preview = text.replace("\n", " ")[:150].strip()
    if len(preview) > 140:
        preview = preview[:140] + "..."

    category_desc = {
        "template": "A blank template or framework",
        "example": "A real-world example or case study",
        "process": "A step-by-step process or workflow",
        "comparison": "A comparison or contrast diagram",
        "diagram": "A conceptual diagram or model",
        "decorative": "An illustrative figure",
    }

    return f"{category_desc.get(category, 'A figure')}. OCR preview: \"{preview}\""


def analyze_image(image_path: Path, lang: str = "eng") -> dict:
    """Analyze a single image and return metadata dict."""
    try:
        img = Image.open(image_path)
        width, height = img.size
        file_size = image_path.stat().st_size

        # Run OCR
        ocr_text = pytesseract.image_to_string(img, lang=lang)

        # Classify
        category = classify_image(ocr_text, width, height, file_size)

        # Extract keywords
        keywords = extract_keywords(ocr_text, category)

        # Generate description
        description = generate_description(ocr_text, category, width, height)

        # Extract source page from filename (e.g., en-page-100-img-1.png -> page 100)
        page_match = re.search(r"page-(\d+)", image_path.name)
        source_page = int(page_match.group(1)) if page_match else None

        return {
            "file": image_path.name,
            "source_page": source_page,
            "width": width,
            "height": height,
            "file_size": file_size,
            "description": description,
            "ocr_text": ocr_text,
            "category": category,
            "keywords": keywords,
        }
    except Exception as e:
        return {
            "file": image_path.name,
            "error": str(e),
        }


def main():
    parser = argparse.ArgumentParser(description="Analyze book images with OCR and auto-classification")
    parser.add_argument("image_dir", help="Directory containing PNG images to analyze")
    parser.add_argument("--output-dir", "-o", default=None, help="Output directory for .meta.json files (default: same as image_dir)")
    parser.add_argument("--lang", default="eng", help="Tesseract OCR language (default: eng)")
    parser.add_argument("--limit", type=int, default=None, help="Limit number of images to process")
    parser.add_argument("--category-filter", default=None, help="Only output images matching this category")
    args = parser.parse_args()

    image_dir = Path(args.image_dir)
    output_dir = Path(args.output_dir) if args.output_dir else image_dir
    output_dir.mkdir(parents=True, exist_ok=True)

    images = sorted(image_dir.glob("*.png"))
    if args.limit:
        images = images[:args.limit]

    print(f"Analyzing {len(images)} images from {image_dir}")
    print(f"Output: {output_dir}")
    print(f"OCR language: {args.lang}")
    print()

    stats = {}
    for i, img_path in enumerate(images, 1):
        meta = analyze_image(img_path, lang=args.lang)
        cat = meta.get("category", "error")
        stats[cat] = stats.get(cat, 0) + 1

        # Write sidecar
        meta_path = output_dir / f"{img_path.stem}.meta.json"
        with open(meta_path, "w", encoding="utf-8") as f:
            json.dump(meta, f, ensure_ascii=False, indent=2)

        if "error" in meta:
            print(f"  [{i}/{len(images)}] FAIL {img_path.name}: {meta['error']}")
        else:
            print(f"  [{i}/{len(images)}] {cat:12s} {img_path.name}")

    print()
    print("=" * 50)
    print("Summary:")
    for cat, count in sorted(stats.items(), key=lambda x: -x[1]):
        print(f"  {cat:12s}: {count}")
    print(f"  {'total':12s}: {len(images)}")


if __name__ == "__main__":
    main()
