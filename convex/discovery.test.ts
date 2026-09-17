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
    ).rejects.toThrow("Enter an ingredient");
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
    expect(() => parseDiscovery({ success: true })).toThrow("invalid response");
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
    ).rejects.toThrow("balance or limits");
    expect(request).toHaveBeenCalledOnce();
  });
  it("rechaza respuestas enormes y JSON inválido", async () => {
    await expect(
      discoverSources(
        { ingredient: "Arroz", region: "Lima" },
        "synthetic-test",
        async () => new Response("x".repeat(1024 * 1024 + 1)),
      ),
    ).rejects.toThrow("could not be completed");
    await expect(
      discoverSources(
        { ingredient: "Arroz", region: "Lima" },
        "synthetic-test",
        async () => new Response("<html>"),
      ),
    ).rejects.toThrow("invalid JSON");
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
    ).rejects.toThrow("may have consumed credits");
    await vi.advanceTimersByTimeAsync(25000);
    await pending;
    expect(request).toHaveBeenCalledOnce();
  });
});

it("uses explicit US geography without appending Peru", async () => {
  const request = vi.fn(async () =>
    Response.json({ success: true, data: { web: [] } }),
  );
  await discoverSources(
    { ingredient: "long grain white rice", region: "Portland, OR, US" },
    "synthetic-test",
    request,
  );
  const body = JSON.parse(
    (request.mock.calls as unknown as [string, RequestInit][])[0][1]
      .body as string,
  );
  expect(body.country).toBe("US");
  expect(body.query).toBe(
    "long grain white rice price wholesale Portland, OR, US",
  );
  expect(body.query).not.toMatch(/Per[uú]/);
});

it("does not guess a country for an unspecified location", async () => {
  const request = vi.fn(async () =>
    Response.json({ success: true, data: { web: [] } }),
  );
  await discoverSources(
    { ingredient: "rice", region: "Springfield" },
    "synthetic-test",
    request,
  );
  const body = JSON.parse(
    (request.mock.calls as unknown as [string, RequestInit][])[0][1]
      .body as string,
  );
  expect(body.country).toBeUndefined();
  expect(body.location).toBe("Springfield");
});

it("does not force Peru when reading a US product page", async () => {
  const { readProductPage } = await import("./lib/firecrawl");
  const url = "https://supplier.com/rice";
  const request = vi.fn(async () =>
    Response.json({
      success: true,
      data: { markdown: "Rice 25 lb", metadata: { url } },
    }),
  );
  await readProductPage(url, "synthetic-test", request, "Portland, OR, US");
  const body = JSON.parse(
    (request.mock.calls as unknown as [string, RequestInit][])[0][1]
      .body as string,
  );
  expect(body.location).toEqual({ country: "US", languages: ["en"] });
});

it("English discovery diversifies queries and suppliers, rejects unrelated pages and recovers an empty product", async () => {
  const sources = [
    {
      url: "https://one.com/product/gala-apples",
      title: "Gala apples 88 count",
      markdown: null,
    },
    {
      url: "https://one.com/product/gala-apples?utm_source=search",
      title: "Gala apples",
      markdown: null,
    },
    {
      url: "https://two.com/product/gala-apples",
      title: "Gala apples",
      markdown: "Gala apples 80 count USD 50",
    },
    {
      url: "https://three.com/product/gala-apples",
      title: "Gala apples",
      markdown: "Gala apples USD 60 per case",
    },
    {
      url: "https://four.com/gala-apples",
      title: "Gala apples distributor",
      markdown: "Gala apples. Ask for a quotation.",
    },
    {
      url: "https://five.com/golden-delicious",
      title: "Golden delicious apples",
      markdown: "Apples USD 45",
    },
    {
      url: "https://six.com/news/gala-apples",
      title: "Gala apples news",
      markdown: "Gala apples industry news",
    },
  ];
  const request = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(init?.body as string);
      if (String(url).endsWith("/scrape"))
        return Response.json({
          success: true,
          data: {
            markdown: "Gala apples 88 count USD 105 per case",
            metadata: { url: body.url, title: "Gala apples" },
          },
        });
      return Response.json({ success: true, data: { web: sources } });
    },
  );
  const result = await discoverSources(
    { ingredient: "Gala apples", region: "New York, US" },
    "test",
    request,
  );
  expect(result.sources.map((s) => new URL(s.url).hostname).sort()).toEqual([
    "four.com",
    "one.com",
    "three.com",
    "two.com",
  ]);
  expect(
    result.sources.find((s) => new URL(s.url).hostname === "one.com")?.markdown,
  ).toContain("88 count");
  expect(
    request.mock.calls.filter(([url]) => String(url).endsWith("/search")),
  ).toHaveLength(3);
  expect(
    request.mock.calls.filter(([url]) => String(url).endsWith("/scrape")),
  ).toHaveLength(1);
  const queries = request.mock.calls
    .slice(0, 2)
    .map(([, init]) => JSON.parse(init!.body as string).query);
  expect(queries).toEqual([
    "Gala apples price wholesale New York, US",
    "Gala apples wholesale supplier New York, US",
  ]);
});

it("an invented English ingredient does not return generic supplier matches", async () => {
  const result = await discoverSources(
    { ingredient: "nonexistent ingredient zxqv-7842", region: "New York, US" },
    "test",
    async () =>
      Response.json({
        success: true,
        data: {
          web: [
            {
              url: "https://supplier.com/",
              title: "Wholesale ingredients",
              markdown:
                "Food ingredients for restaurants. Apples, rice and flour.",
            },
          ],
        },
      }),
  );
  expect(result.sources).toEqual([]);
});

it("recovers a rate-limited page within a bounded budget rather than treating it as no price", async () => {
  vi.useFakeTimers();
  let reads = 0;
  const request = vi.fn(async (url: string | URL | Request) => {
    if (String(url).endsWith("/search"))
      return Response.json({
        success: true,
        data: {
          web: [
            {
              url: "https://supplier.com/product/apples",
              title: "Apples 80 count",
            },
          ],
        },
      });
    reads++;
    if (reads === 1)
      return Response.json(
        { error: "rate limit" },
        { status: 429, headers: { "retry-after": "1" } },
      );
    return Response.json({
      success: true,
      data: {
        markdown: "Apples 80 count USD 50",
        metadata: { url: "https://supplier.com/product/apples" },
      },
    });
  });
  try {
    const pending = discoverSources(
      { ingredient: "apples", region: "New York, US" },
      "test",
      request,
    );
    await vi.runAllTimersAsync();
    const result = await pending;
    expect(reads).toBe(2);
    expect(result.sources[0].markdown).toContain("USD 50");
    expect(result.warning).toBe(false);
  } finally {
    vi.useRealTimers();
  }
});

it("retains sixteen generic candidates while bounding reads independently to twelve", async () => {
  let searches = 0,
    reads = 0;
  const request = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).endsWith("/search")) {
        const offset = searches++ * 10;
        expect(JSON.parse(init!.body as string).limit).toBe(10);
        return Response.json({
          success: true,
          data: {
            web: Array.from({ length: 10 }, (_, i) => ({
              url: `https://supplier${offset + i}.com/product/olive-oil`,
              title: "Olive oil wholesale",
            })),
          },
        });
      }
      reads++;
      const target = JSON.parse(init!.body as string).url;
      return Response.json({
        success: true,
        data: {
          markdown: "Olive oil 5 L USD 40",
          metadata: { url: target, title: "Olive oil" },
        },
      });
    },
  );
  const result = await discoverSources(
    { ingredient: "olive oil", region: "New York, US" },
    "test",
    request,
  );
  expect(searches).toBe(3);
  expect(reads).toBe(12);
  expect(result.sources).toHaveLength(16);
  expect(result.sources.filter((source) => source.markdown)).toHaveLength(12);
  expect(result.warning).toBe(true);
  expect(result.discarded).toBe(14);
});

it("supplier diversity does not permanently discard relevant variants on the same host", async () => {
  const pages = Array.from({ length: 8 }, (_, i) => ({
    url: `https://supplier.com/product/flour-${i}`,
    title: "All purpose flour",
    markdown: "All purpose flour 25 lb USD 20",
  }));
  const result = await discoverSources(
    { ingredient: "all purpose flour", region: "New York, US" },
    "test",
    async () => Response.json({ success: true, data: { web: pages } }),
  );
  expect(result.sources).toHaveLength(8);
  expect(new Set(result.sources.map((source) => source.url)).size).toBe(8);
});

it("matches common singular and plural forms without ingredient-specific mappings", async () => {
  const { rankResearchSources } = await import("./lib/firecrawl");
  for (const [ingredient, title] of [
    ["tomatoes", "Tomato"],
    ["berries", "Berry"],
    ["blueberry", "Blueberries"],
  ]) {
    const pages = rankResearchSources(
      [
        {
          url: "https://supplier.com/product/produce",
          title,
          description: "",
          markdown: title,
          contentTruncated: false,
        },
      ],
      ingredient,
    );
    expect(pages).toHaveLength(1);
  }
});

it("a refined round searches its new question once and excludes known URLs before paid reads", async () => {
  let searches = 0,
    reads = 0;
  const request = vi.fn(
    async (url: string | URL | Request, init?: RequestInit) => {
      const body = JSON.parse(init!.body as string);
      if (String(url).endsWith("/search")) {
        searches++;
        expect(body.query).toBe(
          "olive oil local wholesale delivery New York, US",
        );
        return Response.json({
          success: true,
          data: {
            web: [
              {
                url: "https://known.com/product/olive-oil?utm_source=repeat",
                title: "Olive oil",
              },
              { url: "https://new.com/product/olive-oil", title: "Olive oil" },
            ],
          },
        });
      }
      reads++;
      expect(body.url).toBe("https://new.com/product/olive-oil");
      return Response.json({
        success: true,
        data: {
          markdown: "Olive oil 5 L USD 40",
          metadata: { url: body.url, title: "Olive oil" },
        },
      });
    },
  );
  const result = await discoverSources(
    {
      ingredient: "olive oil",
      region: "New York, US",
      query: "olive oil local wholesale delivery",
      excludeUrls: ["https://known.com/product/olive-oil"],
    },
    "test",
    request,
  );
  expect(searches).toBe(1);
  expect(reads).toBe(1);
  expect(result.sources).toHaveLength(1);
});

it.each([
  [{ "product:price:currency": "USD" }, true],
  [{ "og:price:currency": "USD", "product:price:currency": "CAD" }, false],
  [{ "og:price:currency": ["USD", "USD"] }, true],
  [{}, false],
])(
  "preserves only unambiguous published currency before truncation: %j",
  async (metadata, expected) => {
    const { readProductPage } = await import("./lib/firecrawl");
    const page = await readProductPage(
      "https://supplier.com/flour",
      "synthetic",
      async () =>
        new Response(
          JSON.stringify({
            success: true,
            data: { markdown: "Flour ".repeat(4000), metadata },
          }),
        ),
    );
    expect(
      page.markdown!.startsWith(
        "Published product currency (page metadata): USD\n",
      ),
    ).toBe(expected);
    expect(page.contentTruncated).toBe(true);
    expect(page.markdown).toHaveLength(20000);
  },
);

it.each([
  ["Lima", "Lima, Peru", "PE", ["es-PE", "es"]],
  ["New York, US", "New York, US", "US", ["en"]],
] as const)("adaptive searches retain localization and exclude prior child links: %s", async (region, location, country, languages) => {
  const searches: Record<string, unknown>[] = [];
  const reads: string[] = [];
  const request = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const body = JSON.parse(init!.body as string);
    if (String(url).endsWith("/search")) {
      searches.push(body);
      return Response.json({ success: true, data: { web: [
        { url: "https://proveedor.com/products/arroz-viejo?utm_source=repeat", title: "Arroz" },
        { url: "https://proveedor.com/catalogo/arroz", title: "Arroz" },
      ] } });
    }
    reads.push(body.url);
    expect(body.location).toEqual({ country, languages });
    return Response.json({ success: true, data: {
      markdown: body.url.includes("catalogo")
        ? "Arroz: [Arroz anterior](https://proveedor.com/products/arroz-viejo?utm_campaign=repeat)\n[Arroz nuevo](https://proveedor.com/products/arroz-nuevo)"
        : "Arroz 5 kg S/ 20",
      metadata: { url: body.url, title: "Arroz" },
    } });
  });
  const result = await discoverSources({ ingredient: "Arroz", region, query: "Arroz precio por saco", excludeUrls: ["https://proveedor.com/products/arroz-viejo"] }, "test", request);
  expect(searches).toHaveLength(1);
  expect(searches[0]).toMatchObject({ query: `Arroz precio por saco ${location}`, country, location });
  expect(searches[0]).not.toHaveProperty("scrapeOptions");
  expect(reads).toEqual(["https://proveedor.com/catalogo/arroz", "https://proveedor.com/products/arroz-nuevo"]);
  expect(result.sources.map(s => s.url)).toEqual(expect.arrayContaining(reads));
  expect(result.sources.some(s => s.url.includes("viejo"))).toBe(false);
});
