import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverSources, parseDiscovery } from "./lib/firecrawl";

afterEach(() => vi.useRealTimers());
describe("prueba interna Firecrawl", () => {
  it("sin clave o entrada inválida no hace llamadas", async () => {
    const request = vi.fn();
    await expect(
      discoverSources(
        { ingredient: "Arroz", region: "Lima" },
        undefined,
        request,
      ),
    ).rejects.toThrow("FIRECRAWL_API_KEY");
    await expect(
      discoverSources(
        { ingredient: "", region: "Lima" },
        "synthetic-test",
        request,
      ),
    ).rejects.toThrow("insumo");
    expect(request).not.toHaveBeenCalled();
  });
  it("envía búsqueda acotada al host fijo y mantiene evidencia sin inventar precios", async () => {
    const request = vi.fn(async () =>
      Response.json({
        success: true,
        data: {
          web: [
            {
              url: "https://proveedor.com/arroz",
              title: "Catálogo",
              markdown: "Consultar precio",
            },
          ],
        },
      }),
    );
    const result = await discoverSources(
      { ingredient: "Arroz", region: "Lima" },
      "synthetic-test",
      request,
    );
    expect(request).toHaveBeenCalledOnce();
    expect(request.mock.calls[0]).toBeDefined();
    expect(result.sources[0]).toEqual({
      url: "https://proveedor.com/arroz",
      title: "Catálogo",
      description: "",
      markdown: "Consultar precio",
      contentTruncated: false,
    });
    const init = (request.mock.calls as unknown as [string, RequestInit][])[0];
    expect(init[0]).toBe("https://api.firecrawl.dev/v2/search");
    expect(JSON.parse(init[1].body as string)).toMatchObject({
      country: "PE",
      limit: 3,
      scrapeOptions: {
        formats: [{ type: "markdown" }],
        onlyMainContent: true,
        maxAge: 60 * 60 * 1000,
      },
    });
    expect(init[1].redirect).toBe("error");
  });
  it("keeps a failed page as a reviewable lead but withholds its body from extraction", () => {
    const result = parseDiscovery({
      success: true,
      data: {
        web: [
          {
            url: "https://proveedor.com/error",
            markdown: "Arroz extra S/ 100",
            metadata: {
              title: "Página temporalmente movida",
              description: "El proveedor respondió con una redirección.",
              statusCode: 302,
            },
          },
          {
            url: "https://proveedor.com/cache",
            markdown: "Arroz extra S/ 110",
            metadata: { statusCode: 304 },
          },
        ],
      },
    });
    expect(result.sources[0]).toMatchObject({
      title: "Página temporalmente movida",
      description: "El proveedor respondió con una redirección.",
      markdown: null,
      contentTruncated: false,
    });
    expect(result.sources[1].markdown).toBe("Arroz extra S/ 110");
  });
  it("keeps redirected search leads but withholds bodies attributed to another URL", () => {
    const result = parseDiscovery({
      success: true,
      data: {
        web: [
          {
            url: "https://supplier.example.com/product/arroz",
            markdown: "Arroz extra S/ 100",
            metadata: {
              sourceURL: "https://supplier.example.com/product/arroz",
              url: "https://other.example.org/landing",
              statusCode: 200,
            },
          },
          {
            url: "https://proveedor.com/arroz",
            markdown: "Arroz extra S/ 110",
            metadata: {
              sourceURL: "https://proveedor.com/catalogo",
              url: "https://proveedor.com/arroz",
              statusCode: 200,
            },
          },
          {
            url: "https://PROVEEDOR-VALIDO.com/arroz#resultado",
            markdown: "Arroz extra S/ 120",
            metadata: {
              sourceURL: "https://proveedor-valido.com/arroz#producto",
              url: "https://PROVEEDOR-VALIDO.COM/arroz",
              statusCode: 200,
            },
          },
        ],
      },
    });
    expect(result.sources).toMatchObject([
      {
        url: "https://supplier.example.com/product/arroz",
        markdown: null,
      },
      {
        url: "https://proveedor.com/arroz",
        markdown: null,
      },
      {
        url: "https://proveedor-valido.com/arroz",
        markdown: "Arroz extra S/ 120",
      },
    ]);
  });
  it("descarta enlaces peligrosos y duplicados, declara truncación y ausencia de contenido", () => {
    const result = parseDiscovery({
      success: true,
      data: {
        web: [
          { url: "javascript:alert(1)" },
          { url: "http://127.0.0.1/a" },
          { url: "https://user:password@proveedor.com" },
          { url: "https://proveedor.com/a#top", markdown: "x".repeat(20001) },
          { url: "https://proveedor.com/a" },
          { url: "https://proveedor.com/b" },
        ],
      },
    });
    expect(result.discarded).toBe(4);
    expect(result.sources[0].contentTruncated).toBe(true);
    expect(result.sources[0].markdown).toHaveLength(20000);
    expect(result.sources[1].markdown).toBeNull();
    expect(
      parseDiscovery({ success: true, data: { web: [] } }).sources,
    ).toEqual([]);
    expect(() => parseDiscovery({ success: true })).toThrow("no válida");
  });
  it("no filtra mensajes del proveedor ni reintenta errores de cuota", async () => {
    const request = vi.fn(
      async () => new Response("sensitive-provider-body", { status: 429 }),
    );
    await expect(
      discoverSources(
        { ingredient: "Arroz", region: "Lima" },
        "synthetic-test",
        request,
      ),
    ).rejects.toThrow("saldo o límites");
    expect(request).toHaveBeenCalledOnce();
  });
  it("rechaza respuestas enormes y JSON inválido", async () => {
    await expect(
      discoverSources(
        { ingredient: "Arroz", region: "Lima" },
        "synthetic-test",
        async () => new Response("x".repeat(1024 * 1024 + 1)),
      ),
    ).rejects.toThrow("No se pudo");
    await expect(
      discoverSources(
        { ingredient: "Arroz", region: "Lima" },
        "synthetic-test",
        async () => new Response("<html>"),
      ),
    ).rejects.toThrow("JSON no válido");
  });
  it("aborta timeout sin segunda llamada", async () => {
    vi.useFakeTimers();
    const request = vi.fn(
      (_url: unknown, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) =>
          init?.signal?.addEventListener("abort", () =>
            reject(new Error("aborted")),
          ),
        ),
    );
    const pending = expect(
      discoverSources(
        { ingredient: "Arroz", region: "Lima" },
        "synthetic-test",
        request,
      ),
    ).rejects.toThrow("podría haber consumido créditos");
    await vi.advanceTimersByTimeAsync(25000);
    await pending;
    expect(request).toHaveBeenCalledOnce();
  });
});
