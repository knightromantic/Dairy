/** 将正文按空行分段，与展示、评论锚点一致 */
export function splitIntoParagraphs(content: string): string[] {
  return content
    .split(/\n\s*\n/g)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function paragraphCount(content: string): number {
  const parts = splitIntoParagraphs(content);
  return parts.length > 0 ? parts.length : 1;
}
