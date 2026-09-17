/** Cheap source checks are not semantic validation. The model and user review follow them. */
export type SourceInspection = {
  state: "readable" | "unreadable" | "blocked" | "unrelated";
  reason: string | null;
  links: { url: string; label: string }[];
};

export function publicSourceUrl(value: string): string | null {
  if (value.length > 2000) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      !host.includes(".") ||
      /^[\d.]+$/.test(host) ||
      host.includes(":") ||
      /(^|\.)(localhost|local|internal|test|example|invalid)$/.test(host)
    )
      return null;
    url.hash = "";
    return url.href;
  } catch {
    return null;
  }
}

const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const generic = new Set([
  "ingredient", "ingredients", "nonexistent", "supplier", "suppliers",
  "wholesale", "restaurant", "restaurants", "distributor", "distributors",
  "buy", "online", "price", "prices", "case", "pack", "bulk", "fresh",
  "delivery", "near", "for", "the", "and", "with", "new", "york", "usa",
  "ingrediente",
  "insumo",
  "inexistente",
  "proveedor",
  "proveedores",
  "distribuidor",
  "distribuidores",
  "comprar",
  "precio",
  "precios",
  "lima",
  "peru",
  "litro",
  "litros",
  "kilos",
  "kilogramos",
  "saco",
  "bolsa",
  "bidon",
  "para",
  "por",
  "con",
  "sin",
]);
function singularTerm(term: string) {
  if (term.endsWith("ies") && term.length > 4) return term.slice(0, -3) + "y";
  if (term.endsWith("oes") && term.length > 4) return term.slice(0, -2);
  return term.endsWith("s") && !term.endsWith("ss") ? term.slice(0, -1) : term;
}
export function containsIngredientTerm(text: string, term: string) {
  return normalize(text).split(/[^a-z0-9]+/).some(word => singularTerm(word) === term);
}
export function ingredientTerms(ingredient: string) {
  return normalize(ingredient)
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length >= 3 && !generic.has(t) && !/^\d+$/.test(t))
    .map(singularTerm);
}
function matches(text: string, words: string[]) {
  return words.some(word => containsIngredientTerm(text, word));
}

export function inspectSource(
  source: {
    url: string;
    title: string;
    description: string;
    markdown: string | null;
  },
  ingredient: string,
): SourceInspection {
  const text = source.markdown?.trim();
  if (!text)
    return {
      state: "unreadable",
      reason:
        "This source has no recovered text. You can review the original page.",
      links: [],
    };
  if (
    text.length < 1500 &&
    /error cr[ií]tico|critical error|verify you are human|verifica que eres humano|access denied|checking your browser|just a moment/i.test(
      text.slice(0, 500),
    )
  )
    return {
      state: "blocked",
      reason:
        "The page returned an error or access screen; it does not contain an offer to extract.",
      links: [],
    };
  const words = ingredientTerms(ingredient);
  if (
    words.length &&
    !matches(`${source.title}\n${source.description}\n${text}`, words)
  )
    return {
      state: "unrelated",
      reason:
        "We found no text matches for this ingredient. Review the link or adjust the search.",
      links: [],
    };
  const root = publicSourceUrl(source.url);
  const links: SourceInspection["links"] = [];
  if (root) {
    const origin = new URL(root).origin;
    for (const match of text.matchAll(
      /\[([^\]\n]{1,300})\]\((https?:\/\/[^\s)]+)(?:\s+"[^"]*")?\)/g,
    )) {
      const url = publicSourceUrl(match[2]);
      if (!url || url === root || links.some((link) => link.url === url))
        continue;
      const parsed = new URL(url);
      if (
        parsed.origin !== origin ||
        parsed.search ||
        /\.(?:pdf|png|jpe?g|webp|gif|svg|zip|xml|xlsx?)$/i.test(
          parsed.pathname,
        ) ||
        /(?:^|\/)(?:wp-|media|cart|carrito|checkout|cuenta|login|contact|politic|privacy|terms|feed)/i.test(
          parsed.pathname,
        )
      )
        continue;
      const label = match[1].replace(/[*_!#]/g, "").trim();
      let path = parsed.pathname;
      try {
        path = decodeURI(path);
      } catch {
        /* Keep the encoded path as evidence. */
      }
      if (
        !label ||
        /^(?:agregar|añadir|comprar|agotado|leer m[aá]s|ver m[aá]s)$/i.test(
          label,
        ) ||
        !matches(`${label} ${path}`, words)
      )
        continue;
      links.push({ url, label: label.slice(0, 160) });
      if (links.length === 12) break;
    }
  }
  return { state: "readable", reason: null, links };
}
