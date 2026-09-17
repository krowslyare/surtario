import { sourceKey } from "../../src/domain/researchCoverage";
import { researchLocation } from "../../src/domain/researchMarket";
import { providerFetch } from "./providerTransport";
import {
  publicSourceUrl,
  ingredientTerms,
  containsIngredientTerm,
  inspectSource,
} from "./sourceQuality";

export const MAX_RESEARCH_SOURCES = 16;
export const RESEARCH_SEARCH_LIMIT = 10;
export const RESEARCH_READ_BUDGET = 12;
const SEARCH_CONTENT_MAX_AGE_MS = 60 * 60 * 1000;

/** Server-only discovery adapter. Returned page text is untrusted evidence, never an offer. */
export type DiscoveredSource = {
  url: string;
  title: string;
  description: string;
  markdown: string | null;
  contentTruncated: boolean;
};
export type DiscoveryResult = {
  sources: DiscoveredSource[];
  discarded: number;
  warning: boolean;
};
function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function cleanPageStatus(value: unknown) {
  return (
    typeof value !== "number" || (value >= 200 && value < 300) || value === 304
  );
}
function sameReportedPage(value: unknown, target: string) {
  return (
    typeof value !== "string" ||
    (publicSourceUrl(value) !== null &&
      canonicalCandidate(publicSourceUrl(value)!) ===
        canonicalCandidate(target))
  );
}
export function parseDiscovery(value: unknown, limit = 3): DiscoveryResult {
  const body = record(value);
  const web = record(body.data).web;
  if (body.success !== true || !Array.isArray(web))
    throw new Error("Firecrawl returned an invalid response.");
  const sources: DiscoveredSource[] = [];
  const seen = new Set<string>();
  let discarded = 0;
  for (const item of web) {
    const page = record(item);
    const metadata = record(page.metadata);
    const url = typeof page.url === "string" ? publicSourceUrl(page.url) : null;
    if (!url || seen.has(url) || sources.length >= limit) {
      discarded++;
      continue;
    }
    seen.add(url);
    const markdown =
      cleanPageStatus(metadata.statusCode) &&
      sameReportedPage(metadata.sourceURL, url) &&
      sameReportedPage(metadata.url, url) &&
      typeof page.markdown === "string" &&
      page.markdown.trim()
        ? page.markdown
        : null;
    sources.push({
      url,
      title:
        typeof page.title === "string"
          ? page.title.slice(0, 300)
          : typeof metadata.title === "string"
            ? metadata.title.slice(0, 300)
            : "Untitled source",
      description:
        typeof page.description === "string"
          ? page.description.slice(0, 2000)
          : typeof metadata.description === "string"
            ? metadata.description.slice(0, 2000)
            : "",
      markdown: markdown?.slice(0, 20000) ?? null,
      contentTruncated: (markdown?.length ?? 0) > 20000,
    });
  }
  return {
    sources,
    discarded,
    warning: typeof body.warning === "string" && !!body.warning,
  };
}
class PageRateLimit extends Error {
  constructor(readonly retryMs: number) {
    super("Firecrawl page reads are temporarily rate limited.");
  }
}
async function limitedJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Firecrawl returned an empty response.");
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1024 * 1024)
        throw new Error("The Firecrawl response exceeds the reading limit.");
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Firecrawl returned invalid JSON.");
    }
  } finally {
    await reader.cancel();
  }
}

/** Read one verified public product link; never browse recursively. */
export async function readProductPage(
  url: string,
  apiKey: string | undefined,
  request: typeof fetch = providerFetch,
  region?: string,
  discoveryRead = false,
): Promise<DiscoveredSource> {
  const target = publicSourceUrl(url);
  if (!target || !apiKey?.trim())
    throw new Error("The product page or reading configuration is invalid.");
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 25000);
  try {
    const response = await request("https://api.firecrawl.dev/v2/scrape", {
      method: "POST",
      redirect: "error",
      signal: abort.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: target,
        formats: ["markdown"],
        onlyMainContent: true,
        maxAge: discoveryRead ? SEARCH_CONTENT_MAX_AGE_MS : 0,
        timeout: 20000,
        parsers: [],
        ...(region
          ? {
              location: {
                country: researchLocation(region).country,
                languages:
                  researchLocation(region).language === "es"
                    ? ["es-PE", "es"]
                    : ["en"],
              },
            }
          : {}),
      }),
    });
    if (!response.ok) {
      if (response.status === 429) {
        const after = response.headers.get("retry-after");
        await response.body?.cancel();
        const seconds = after && /^\d+$/.test(after) ? Number(after) : 60;
        if (seconds > 60)
          throw new Error(
            "Firecrawl requires a longer cooldown; review this source later.",
          );
        throw new PageRateLimit(Math.max(1000, seconds * 1000));
      }
      const reason = record(await limitedJson(response));
      throw new Error(
        `Firecrawl product-page read failed (HTTP ${response.status}): ${String(reason.error ?? "unavailable").slice(0, 250)}`,
      );
    }
    const body = record(await limitedJson(response));
    const data = record(body.data);
    const metadata = record(data.metadata);
    if (
      body.success !== true ||
      typeof data.markdown !== "string" ||
      !data.markdown.trim() ||
      !cleanPageStatus(metadata.statusCode)
    )
      throw new Error("The product page returned no usable content.");
    const returnedUrl =
      typeof metadata.url === "string"
        ? metadata.url
        : typeof metadata.sourceURL === "string"
          ? metadata.sourceURL
          : target;
    const canonical = publicSourceUrl(returnedUrl);
    if (
      !canonical ||
      canonicalCandidate(canonical) !== canonicalCandidate(target)
    )
      throw new Error(
        "The product page redirected elsewhere; review the original link.",
      );
    // Preserve explicit product currency even when the body is truncated.
    // Conflicting metadata is not a license to choose a currency.
    const currencies = [
      ...new Set(
        [metadata["og:price:currency"], metadata["product:price:currency"]]
          .flatMap((value) => (Array.isArray(value) ? value : [value]))
          .filter(
            (value): value is string =>
              typeof value === "string" && !!value.trim(),
          )
          .map((value) => value.trim().toUpperCase()),
      ),
    ];
    const currencyNote =
      currencies.length === 1 && ["USD", "PEN"].includes(currencies[0])
        ? `Published product currency (page metadata): ${currencies[0]}\n`
        : "";
    const pageText = currencyNote + data.markdown;
    return {
      url: target,
      title:
        typeof metadata.title === "string"
          ? metadata.title.slice(0, 300)
          : "Untitled source",
      description:
        typeof metadata.description === "string"
          ? metadata.description.slice(0, 2000)
          : "",
      markdown: pageText.slice(0, 20000),
      contentTruncated: pageText.length > 20000,
    };
  } finally {
    clearTimeout(timeout);
  }
}
async function searchSources(
  input: { ingredient: string; region: string; query?: string },
  apiKey: string | undefined,
  request: typeof fetch = providerFetch,
  options?: { query: string; limit: number; metadataOnly?: boolean },
): Promise<DiscoveryResult> {
  if (
    !input.ingredient.trim() ||
    input.ingredient.length > 120 ||
    !input.region.trim() ||
    input.region.length > 80
  )
    throw new Error(
      "Enter an ingredient of up to 120 characters and an area of up to 80.",
    );
  if (!apiKey?.trim())
    throw new Error(
      "Configure FIRECRAWL_API_KEY in the backend to run this test.",
    );
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 25000);
  try {
    const response = await request("https://api.firecrawl.dev/v2/search", {
      method: "POST",
      redirect: "error",
      signal: abort.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query:
          options?.query ??
          `${input.ingredient.trim()} ${researchLocation(input.region).language === "es" ? "proveedores distribuidores" : "wholesale restaurant suppliers"} ${researchLocation(input.region).location}`,
        ...(researchLocation(input.region).country
          ? { country: researchLocation(input.region).country }
          : {}),
        location: researchLocation(input.region).location,
        limit: options?.limit ?? 3,
        sources: ["web"],
        timeout: 20000,
        ...(!options?.metadataOnly
          ? {
              scrapeOptions: {
                formats: [{ type: "markdown" }],
                onlyMainContent: true,
                // Discovery tolerates a short cache window; selected product reads are fresh.
                maxAge: SEARCH_CONTENT_MAX_AGE_MS,
              },
            }
          : {}),
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403)
        throw new Error(
          "Firecrawl rejected the credential or its permissions.",
        );
      if (response.status === 429 || response.status === 402)
        throw new Error(
          "Firecrawl is not accepting more requests now. Review the balance or limits.",
        );
      throw new Error(
        "Firecrawl did not complete the request. Check availability before trying again.",
      );
    }
    return parseDiscovery(await limitedJson(response), options?.limit ?? 3);
  } catch (error) {
    if (abort.signal.aborted)
      throw new Error(
        "Firecrawl timed out. The request may have consumed credits and will not retry automatically.",
      );
    if (error instanceof Error && error.message.startsWith("Firecrawl"))
      throw error;
    throw new Error(
      "The Firecrawl read could not be completed and will not retry automatically.",
    );
  } finally {
    clearTimeout(timeout);
  }
}

function canonicalCandidate(url: string) {
  const parsed = new URL(url);
  for (const key of [...parsed.searchParams.keys()])
    if (/^(utm_|srsltid$|gclid$|fbclid$)/i.test(key))
      parsed.searchParams.delete(key);
  return parsed.href;
}

/** Retrieval relevance only: never turns snippets or currency symbols into offers. */
export function rankResearchSources(
  sources: DiscoveredSource[],
  ingredient: string,
) {
  const terms = ingredientTerms(ingredient);
  const unique = new Map<string, DiscoveredSource>();
  for (const source of sources) {
    const key = canonicalCandidate(source.url);
    if (!unique.has(key) || (!unique.get(key)!.markdown && source.markdown))
      unique.set(key, source);
  }
  return [...unique.values()]
    .map((source) => {
      const title =
        `${source.title} ${new URL(source.url).pathname}`.toLowerCase();
      const text =
        `${title} ${source.description} ${source.markdown ?? ""}`.toLowerCase();
      const contains = containsIngredientTerm;
      // All specific ingredient terms must match, not just 'ingredient' or 'wholesale'.
      if (!terms.length || !terms.every((term) => contains(text, term)))
        return { source, score: -1 };
      if (
        /\/(?:offrange|news|blog|recipes?|articles?)\//i.test(source.url) ||
        /^(?:facebook|instagram|pinterest|yelp|youtube|reddit|tripadvisor)\./i.test(
          new URL(source.url).hostname.replace(/^(?:www|m)\./, ""),
        )
      )
        return { source, score: -1 };
      const titleMatch = terms.every((term) => contains(title, term));
      const product = /\/(?:products?|p|shop)\/|\d{5,}\.html/i.test(source.url);
      if (
        (product || /\/price-history\//.test(source.url)) &&
        !titleMatch &&
        source.title !== "Untitled source"
      )
        return { source, score: -1 };
      if (/best-sellers|\/varieties\//i.test(source.url))
        return { source, score: -1 };
      if (
        !titleMatch &&
        !/supplier|wholesale|distributor|produce|farm|catalog|market|food/i.test(
          title,
        )
      )
        return { source, score: -1 };
      const prices = /(?:\$|USD|£|€)\s*\d/.test(source.markdown ?? "");
      return {
        source,
        score:
          (titleMatch ? 8 : 0) +
          (product ? 4 : 0) +
          (prices ? 2 : 0) +
          (source.markdown ? 1 : 0),
      };
    })
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.source);
}

export async function discoverSources(
  input: {
    ingredient: string;
    region: string;
    query?: string;
    excludeUrls?: string[];
  },
  apiKey: string | undefined,
  request: typeof fetch = providerFetch,
): Promise<DiscoveryResult> {
  const location = researchLocation(input.region);
  // Keep the initial Spanish quick search, but adaptive rounds must honor
  // their refinement and exclude known URLs before any paid page reads.
  if (location.language === "es" && !input.query && !input.excludeUrls?.length)
    return searchSources(input, apiKey, request);
  const queries = input.query
    ? [`${input.query.trim()} ${location.location}`]
    : location.language === "es"
      ? [`${input.ingredient.trim()} proveedores distribuidores ${location.location}`]
      : [
        `${(input.query ?? input.ingredient).trim()} price wholesale ${location.location}`,
        `${(input.query ?? input.ingredient).trim()} wholesale supplier ${location.location}`,
        `"${input.ingredient.trim()}" bulk buy price ${location.country ?? location.location}`,
      ];
  const gathered: DiscoveredSource[] = [];
  let discarded = 0,
    warning = false,
    completed = 0;
  let failure: unknown;
  for (const query of queries) {
    try {
      const result = await searchSources(input, apiKey, request, {
        query,
        limit: RESEARCH_SEARCH_LIMIT,
        metadataOnly: true,
      });
      gathered.push(...result.sources);
      discarded += result.discarded;
      warning ||= result.warning;
      completed++;
    } catch (error) {
      // Do not hide credential/quota errors or silently retry a failed paid call.
      if (/credential|balance or limits/.test(String(error))) throw error;
      failure = error;
      warning = true;
    }
  }
  if (!completed) throw failure;
  const excluded = new Set((input.excludeUrls ?? []).map(sourceKey));
  const ranked = rankResearchSources(gathered, input.ingredient).filter(
    (source) => !excluded.has(sourceKey(source.url)),
  );
  // Round-robin by host: diversity is a priority, not a hard exclusion rule.
  const hosts = new Map<string, DiscoveredSource[]>();
  for (const source of ranked) {
    const host = new URL(source.url).hostname.replace(/^www\./, "");
    const group = hosts.get(host) ?? [];
    group.push(source);
    hosts.set(host, group);
  }
  const diverse: DiscoveredSource[] = [];
  while ([...hosts.values()].some((group) => group.length))
    for (const group of hosts.values()) {
      const source = group.shift();
      if (source) diverse.push(source);
    }
  const selected = diverse.slice(0, MAX_RESEARCH_SOURCES);
  let reads = 0;
  // A 429 is a rate limit, not evidence that the product has no price. Respect
  // Retry-After and allow two bounded re-attempts per study, never retry other failures.
  let rateRetries = 0;
  const read = async (url: string): Promise<DiscoveredSource> => {
    try {
      return await readProductPage(
        canonicalCandidate(url),
        apiKey,
        request,
        input.region,
        true,
      );
    } catch (error) {
      if (!(error instanceof PageRateLimit) || rateRetries >= 2) throw error;
      rateRetries++;
      await new Promise((resolve) => setTimeout(resolve, error.retryMs));
      return read(url);
    }
  };
  const attempted = new Set<string>();
  const recover = async (source: DiscoveredSource) => {
    if (source.markdown) return source;
    if (reads >= RESEARCH_READ_BUDGET) {
      warning = true;
      return source;
    }
    reads++;
    attempted.add(canonicalCandidate(source.url));
    try {
      const page = await read(source.url);
      return page.title === "Untitled source"
        ? { ...page, title: source.title }
        : page;
    } catch {
      warning = true;
      return source;
    }
  };
  // Reserve two reads for specific product links discovered inside catalog pages.
  const known = new Set([
    ...excluded,
    ...selected.map((source) => sourceKey(source.url)),
  ]);
  for (
    let index = 0;
    index < selected.length && reads < RESEARCH_READ_BUDGET - 2;
    index++
  )
    selected[index] = await recover(selected[index]);
  for (const source of [...selected]) {
    if (reads >= RESEARCH_READ_BUDGET) break;
    // A product page should not send the research sideways into related products.
    if (/\/(?:products?|p|shop)\/|\d{5,}\.html/i.test(source.url)) continue;
    const child = inspectSource(source, input.ingredient).links.find(
      (link) =>
        !known.has(sourceKey(link.url)) &&
        /\/(?:products?|p|shop)\/|\d{5,}\.html/i.test(link.url),
    );
    if (!child) continue;
    known.add(sourceKey(child.url));
    reads++;
    try {
      const page = await read(child.url);
      if (!rankResearchSources([page], input.ingredient).length) continue;
      if (selected.length < MAX_RESEARCH_SOURCES) selected.push(page);
      else {
        let unread = selected.length - 1;
        while (unread >= 0 && selected[unread].markdown) unread--;
        if (unread >= 0) selected[unread] = page;
      }
    } catch {
      warning = true;
    }
  }
  // Spend remaining reads on candidates still without text, never repeat a failed URL.
  for (
    let index = 0;
    index < selected.length && reads < RESEARCH_READ_BUDGET;
    index++
  )
    if (
      !selected[index].markdown &&
      !attempted.has(canonicalCandidate(selected[index].url))
    )
      selected[index] = await recover(selected[index]);
  warning ||= selected.some((source) => !source.markdown);
  const sources = rankResearchSources(selected, input.ingredient).slice(
    0,
    MAX_RESEARCH_SOURCES,
  );
  const retainedOriginals = new Set(
    gathered
      .filter((candidate) =>
        sources.some(
          (source) =>
            canonicalCandidate(source.url) ===
            canonicalCandidate(candidate.url),
        ),
      )
      .map((source) => canonicalCandidate(source.url)),
  );
  return {
    sources,
    discarded: discarded + gathered.length - retainedOriginals.size,
    warning,
  };
}
