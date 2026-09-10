import { providerFetch } from "./providerTransport";
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
function publicUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.length > 2000) return null;
  try {
    const url = new URL(value);
    // This adapter never fetches returned URLs. Restrict links before exposing evidence.
    if (
      !["https:", "http:"].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port
    )
      return null;
    const host = url.hostname.toLowerCase();
    if (
      !host.includes(".") ||
      /(^|\.)(localhost|local|internal|test|example)$/.test(host) ||
      /^[\d.]+$/.test(host) ||
      host.includes(":")
    )
      return null;
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
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
    const url = publicUrl(page.url);
    if (!url || seen.has(url) || sources.length >= 3) {
      discarded++;
      continue;
    }
    seen.add(url);
    const markdown =
      typeof page.markdown === "string" && page.markdown.trim()
        ? page.markdown
        : null;
    sources.push({
      url,
      title:
        typeof page.title === "string"
          ? page.title.slice(0, 300)
          : "Fuente sin título",
      description:
        typeof page.description === "string"
          ? page.description.slice(0, 2000)
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
        scrapeOptions: { formats: [{ type: "markdown" }] },
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
