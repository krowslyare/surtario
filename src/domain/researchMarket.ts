/** Explicit country suffixes drive localization. Legacy Peru areas retain their original search context. */
export function researchLocation(region: string): { country?: string; location: string; language: "en" | "es" } {
  const area = region.trim();
  if (/\b(?:US|USA|United States)$/i.test(area)) return { country: "US", location: area, language: "en" };
  if (/\b(?:PE|Peru|Perú)$/i.test(area) || /^(Lima|Arequipa|Cusco)$/i.test(area))
    return { country: "PE", location: /^(Lima|Arequipa|Cusco)$/i.test(area) ? `${area}, Peru` : area, language: "es" };
  return { location: area, language: "en" };
}
