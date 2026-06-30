#!/usr/bin/env python3
"""Split Christensen Innovator's Dilemma txt into chapters based on CHAPTER markers."""
import json, os, re

SRC = "/Users/siboli/Documents/CodeBuddy/BusinessBooks/[创新者的窘境].The.Innovators.Dilemma.(美)Clayton.M.Christensen.英文文字版.txt"
OUT = "/Users/siboli/Documents/CodeBuddy/BusinessModelCanvas/extracts/christensen-en"

os.makedirs(f"{OUT}/chapters", exist_ok=True)

with open(SRC, 'r', encoding='utf-8', errors='replace') as f:
    text = f.read()

# Clean smart quotes and other artifacts
text = text.replace('\ufeff', '')

# Chapter markers (CHAPTER ONE through CHAPTER ELEVEN)
chapter_pattern = re.compile(r'(CHAPTER\s+(ONE|TWO|THREE|FOUR|FIVE|SIX|SEVEN|EIGHT|NINE|TEN|ELEVEN))', re.IGNORECASE)
splits = list(chapter_pattern.finditer(text))

chapter_names = {
    'ONE': 'How Can Great Firms Fail? Insights from the Hard Disk Drive Industry',
    'TWO': 'Value Networks and the Impetus to Innovate',
    'THREE': 'Disruptive Technological Change in the Mechanical Excavator Industry',
    'FOUR': 'What Goes Up, Cant Go Down',
    'FIVE': 'Give Responsibility for Disruptive Technologies to Organizations Whose Customers Need Them',
    'SIX': 'Match the Size of the Organization to the Size of the Market',
    'SEVEN': 'Discovering New and Emerging Markets',
    'EIGHT': 'How to Appraise Your Organizations Capabilities and Disabilities',
    'NINE': 'Performance Provided, Market Demand, and the Product Life Cycle',
    'TEN': 'Managing Disruptive Technological Change: A Case Study',
    'ELEVEN': 'The Dilemmas of Innovation: A Summary'
}

toc = []
chapter_texts = []

for i, match in enumerate(splits):
    num_word = match.group(2).upper()
    start = match.start()
    end = splits[i+1].start() if i+1 < len(splits) else len(text)
    chapter_text = text[start:end].strip()
    title = chapter_names.get(num_word, match.group(1))
    
    slug = f"{i+1:02d}-{re.sub(r'[^a-zA-Z0-9-]', '', title.replace(' ', '-').lower())[:60]}"
    filepath = os.path.join(OUT, "chapters", f"{slug}.txt")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(f"# {title}\n\n")
        f.write(chapter_text)
    
    toc.append({"level": 2, "title": title, "page": i+1})
    chapter_texts.append({"index": i+1, "title": title, "slug": slug, "chars": len(chapter_text)})
    print(f"  Ch{i+1:02d}: {title[:60]}... ({len(chapter_text)} chars)")

# Write TOC
with open(os.path.join(OUT, "toc.json"), 'w', encoding='utf-8') as f:
    json.dump(toc, f, ensure_ascii=False, indent=2)

# Write full text
with open(os.path.join(OUT, "full.txt"), 'w', encoding='utf-8') as f:
    f.write(text)

print(f"\nDone: {len(chapter_texts)} chapters → {OUT}/chapters/")
