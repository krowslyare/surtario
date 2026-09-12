/** The reviewed source must have the same identity before and after persistence. */
export function reviewedWebEvidence(source: {
  title: string;
  markdown?: string | null;
  description: string;
  analysis?: { summary: string; warnings: string[] } | null;
}) {
  const text = source.markdown ?? source.description;
  if (!source.analysis) return text;
  return `Page title: ${source.title.replace(/\s+/g, " ").trim()}\n\n${text}\n\nProposed source analysis (requires review): ${source.analysis.summary}\n${source.analysis.warnings.join("\n")}`;
}
