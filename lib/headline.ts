/**
 * Splits a headline into a lead and a tail set in the highlight colour: at a
 * colon or a spaced dash when there is one, else the last ~40% of the words.
 * Titles under four words get no highlight.
 */
export function splitHeadline(title: string): [string, string] {
  const text = title.trim();
  const m = text.match(/^(.+?:)\s+(.+)$/) ?? text.match(/^(.+?)\s+[-–—]\s+(.+)$/);
  if (m) return [m[1], m[2]];
  const words = text.split(/\s+/);
  if (words.length < 4) return [text, ""];
  const cut = words.length - Math.max(2, Math.round(words.length * 0.4));
  return [words.slice(0, cut).join(" "), words.slice(cut).join(" ")];
}
