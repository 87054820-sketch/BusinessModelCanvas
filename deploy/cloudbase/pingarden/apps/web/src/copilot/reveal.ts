export const REVEAL_INTERVAL_MS = 24;
export const REVEAL_MIN_CHUNK_SIZE = 120;
export const REVEAL_TARGET_CHUNK_SIZE = 360;

export function takeRevealChunk(text: string): string {
  if (text.length <= REVEAL_TARGET_CHUNK_SIZE) return text;
  const windowText = text.slice(0, REVEAL_TARGET_CHUNK_SIZE);
  const paragraphBoundary = windowText.lastIndexOf('\n\n');
  if (paragraphBoundary >= REVEAL_MIN_CHUNK_SIZE) return text.slice(0, paragraphBoundary + 2);

  const lineBoundary = windowText.lastIndexOf('\n');
  if (lineBoundary >= REVEAL_MIN_CHUNK_SIZE) return text.slice(0, lineBoundary + 1);

  const sentenceBoundary = Math.max(
    windowText.lastIndexOf('。'),
    windowText.lastIndexOf('！'),
    windowText.lastIndexOf('？'),
    windowText.lastIndexOf('. '),
    windowText.lastIndexOf('! '),
    windowText.lastIndexOf('? '),
  );
  if (sentenceBoundary >= REVEAL_MIN_CHUNK_SIZE) return text.slice(0, sentenceBoundary + 1);

  return text.slice(0, REVEAL_TARGET_CHUNK_SIZE);
}

export function splitStreamingBlocks(content: string): string[] {
  const blocks = content
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  return blocks.length > 0 ? blocks : [content];
}
