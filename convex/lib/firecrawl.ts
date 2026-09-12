import { providerFetch } from "./providerTransport";
import { publicSourceUrl } from "./sourceQuality";

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
    typeof value !== "number" ||
    (value >= 200 && value < 300) ||
    value === 304
  );
}
function sameReportedPage(value: unknown, target: string) {
  return typeof value !== "string" || publicSourceUrl(value) === target;
}
export function parseDiscovery(value: unknown): DiscoveryResult {
  const body = record(value);
  const web = record(body.data).web;
  if (body.success !== true || !Array.isArray(web))
    throw new Error("Firecrawl devolvió una respuesta no válida.");
  const sources: DiscoveredSource[] = [];
  const seen = new Set<string>();
  let discarded = 0;
  for (const item of web) {
    const page = record(item);
    const metadata = record(page.metadata);
    const url =
      typeof page.url === "string" ? publicSourceUrl(page.url) : null;
    if (!url || seen.has(url) || sources.length >= 3) {
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
            : "Fuente sin título",
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
async function limitedJson(response: Response): Promise<unknown> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Firecrawl devolvió una respuesta vacía.");
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 1024 * 1024)
        throw new Error(
          "La respuesta de Firecrawl excede el límite de lectura.",
        );
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    try {
      return JSON.parse(text);
    } catch {
      throw new Error("Firecrawl devolvió JSON no válido.");
    }
  } finally {
    await reader.cancel();
  }
}

/** Read one user-selected, server-verified public product link; never browse recursively. */
export async function readProductPage(
  url: string,
  apiKey: string | undefined,
  request: typeof fetch = providerFetch,
): Promise<DiscoveredSource> {
  const target = publicSourceUrl(url);
  if (!target || !apiKey?.trim())
    throw new Error("La ficha o la configuración de lectura no es válida.");
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
        maxAge: 0,
        timeout: 20000,
        parsers: [],
        location: { country: "PE", languages: ["es-PE", "es"] },
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error("Firecrawl no completó la lectura de la ficha.");
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
      throw new Error("La ficha no devolvió contenido utilizable.");
    const returnedUrl =
      typeof metadata.url === "string"
        ? metadata.url
        : typeof metadata.sourceURL === "string"
          ? metadata.sourceURL
          : target;
    const canonical = publicSourceUrl(returnedUrl);
    if (canonical !== target)
      throw new Error(
        "La ficha cambió de dirección; revisa el enlace original.",
      );
    return {
      url: target,
      title:
        typeof metadata.title === "string"
          ? metadata.title.slice(0, 300)
          : "Ficha del producto",
      description:
        typeof metadata.description === "string"
          ? metadata.description.slice(0, 2000)
          : "",
      markdown: data.markdown.slice(0, 20000),
      contentTruncated: data.markdown.length > 20000,
    };
  } finally {
    clearTimeout(timeout);
  }
}
export async function discoverSources(
  input: { ingredient: string; region: string },
  apiKey: string | undefined,
  request: typeof fetch = providerFetch,
): Promise<DiscoveryResult> {
  if (
    !input.ingredient.trim() ||
    input.ingredient.length > 120 ||
    !input.region.trim() ||
    input.region.length > 80
  )
    throw new Error(
      "Indica un insumo de hasta 120 caracteres y una zona de hasta 80.",
    );
  if (!apiKey?.trim())
    throw new Error(
      "Configura FIRECRAWL_API_KEY en el backend para ejecutar esta prueba.",
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
        query: `${input.ingredient.trim()} proveedores distribuidores ${input.region.trim()} Perú`,
        country: "PE",
        location: `${input.region.trim()}, Peru`,
        limit: 3,
        sources: ["web"],
        timeout: 20000,
        scrapeOptions: {
          formats: [{ type: "markdown" }],
          onlyMainContent: true,
          // Discovery tolerates a short cache window; selected product reads are fresh.
          maxAge: SEARCH_CONTENT_MAX_AGE_MS,
        },
      }),
    });
    if (!response.ok) {
      await response.body?.cancel();
      if (response.status === 401 || response.status === 403)
        throw new Error("Firecrawl rechazó la credencial o sus permisos.");
      if (response.status === 429 || response.status === 402)
        throw new Error(
          "Firecrawl no permite más consultas ahora. Revisa saldo o límites.",
        );
      throw new Error(
        "Firecrawl no completó la consulta. Comprueba su disponibilidad antes de repetirla.",
      );
    }
    return parseDiscovery(await limitedJson(response));
  } catch (error) {
    if (abort.signal.aborted)
      throw new Error(
        "Se agotó el tiempo de Firecrawl. La solicitud podría haber consumido créditos; no se reintenta automáticamente.",
      );
    if (error instanceof Error && error.message.startsWith("Firecrawl"))
      throw error;
    throw new Error(
      "No se pudo completar la lectura de Firecrawl. No se reintenta automáticamente.",
    );
  } finally {
    clearTimeout(timeout);
  }
}
