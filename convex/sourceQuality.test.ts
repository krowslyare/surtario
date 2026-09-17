// @vitest-environment edge-runtime
import { convexTest } from "convex-test";
import { afterEach, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { inspectSource } from "./lib/sourceQuality";
import {
  validateWebAnalysis,
  boundedWebAnalysisSchema,
  webSourceText,
  sourceEvidenceLines,
} from "./lib/webAnalysis";
import { readProductPage } from "./lib/firecrawl";
const modules = import.meta.glob("./**/*.ts");
const token = "e".repeat(64);
const productUrl = "https://supplier.com/producto/arroz-extra-49kg";
const parent = {
  url: "https://supplier.com/arroz",
  title: "Catálogo de arroz",
  description: "",
  markdown: `[Arroz extra 49 kg](${productUrl})\n[Arroz distinto](https://other.com/arroz)\n[Arroz carrito](https://supplier.com/cart/arroz)`,
  contentTruncated: false,
};
const noOffer = Object.fromEntries(
  [
    "supplier",
    "ingredient",
    "specification",
    "packageContent",
    "packageUnit",
    "price",
    "currency",
  ].map((k) => [k, { value: null, evidenceLineNumber: null }]),
);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
async function seed(t: ReturnType<typeof convexTest>, sources = [parent]) {
  const reserved = await t.mutation(internal.research.reserveSearch, {
    token,
    clientId: crypto.randomUUID(),
    ingredient: "Arroz extra",
    region: "Lima",
  });
  await t.mutation(internal.research.finishSearch, {
    id: reserved.run.id,
    sources,
    discarded: 0,
    warning: false,
    simulated: false,
  });
  return reserved.run.id;
}
function enable() {
  vi.stubEnv("LIVE_RESEARCH_ENABLED", "true");
  vi.stubEnv("FIRECRAWL_API_KEY", "test-only");
}

test("source inspection rejects broken content and lexical mismatch while keeping contact-only evidence", () => {
  expect(
    inspectSource(
      { ...parent, markdown: "Ha habido un error crítico en esta web." },
      "arroz",
    ).state,
  ).toBe("blocked");
  expect(inspectSource({ ...parent, markdown: null }, "arroz").state).toBe(
    "unreadable",
  );
  expect(
    inspectSource(
      {
        ...parent,
        title: "Registro de proveedores",
        markdown: "Arbitraje de consumo",
      },
      "ingrediente inexistente zxqv-7842",
    ).state,
  ).toBe("unrelated");
  expect(
    inspectSource(
      { ...parent, markdown: "Distribuimos arroz; consultar cotización." },
      "arroz",
    ).state,
  ).toBe("readable");
  expect(inspectSource(parent, "arroz").links).toEqual([
    { url: productUrl, label: "Arroz extra 49 kg" },
  ]);
  expect(
    inspectSource(
      { ...parent, markdown: "[Arroz](https://supplier.com/arroz-%ZZ)" },
      "arroz",
    ).state,
  ).toBe("readable");
});

test("non-product analysis discards stray prices before validating offers and rejects unknown references", () => {
  const raw = {
    analysis: {
      kind: "catalog",
      summary: "Elige una presentación.",
      evidenceLineNumbers: [1],
      warnings: ["La categoría incluye varias presentaciones."],
    },
    offer: { ...noOffer, price: { value: "200", evidenceLineNumber: 9999 } },
  };
  const result = validateWebAnalysis(raw, "Arroz extra 49 kg S/200");
  expect(result.offer.price).toEqual({ value: null, evidence: null });
  expect(result.analysis.evidence).toEqual(["Arroz extra 49 kg S/200"]);
  expect(() =>
    validateWebAnalysis(
      { ...raw, analysis: { ...raw.analysis, evidenceLineNumbers: [2] } },
      "Arroz extra 49 kg S/200",
    ),
  ).toThrow(/does not exist/);
  expect(() =>
    validateWebAnalysis(
      { ...raw, analysis: { ...raw.analysis, kind: "product" } },
      "Arroz extra 49 kg S/200",
    ),
  ).toThrow(/does not exist/);
  expect(() =>
    validateWebAnalysis(
      {
        ...raw,
        analysis: { ...raw.analysis, kind: "product" },
        offer: {
          ...noOffer,
          price: { value: "200", evidenceLineNumber: null },
        },
      },
      "Arroz extra 49 kg S/200",
    ),
  ).toThrow(/without evidence/);
});

test("product reading accepts only an owned source link, preserves parent, and never repeats a read", async () => {
  enable();
  const t = convexTest(schema, modules);
  const runId = await seed(t);
  const fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
    expect(JSON.parse(String(init?.body))).toMatchObject({
      url: productUrl,
      formats: ["markdown"],
      onlyMainContent: true,
      maxAge: 0,
      parsers: [],
      location: { country: "PE", languages: ["es-PE", "es"] },
    });
    return Response.json({
      success: true,
      data: {
        markdown: "Arroz extra 49 kg: S/200.",
        metadata: {
          title: "Arroz extra",
          sourceURL: productUrl,
          statusCode: 200,
        },
      },
    });
  });
  vi.stubGlobal("fetch", fetch);
  const args = { token, runId, sourceIndex: 0, url: productUrl };
  await expect(
    t.action(api.research.readProduct, { ...args, token: "f".repeat(64) }),
  ).rejects.toThrow(/unavailable/);
  await expect(
    t.action(api.research.readProduct, {
      ...args,
      url: "https://other.com/arroz",
    }),
  ).rejects.toThrow(/Select a product link/);
  expect(fetch).not.toHaveBeenCalled();
  const read = await t.action(api.research.readProduct, args);
  expect(read.sources).toHaveLength(2);
  expect(read.sources[0].markdown).toBe(parent.markdown);
  expect(read.sources[1]).toMatchObject({
    parentSourceIndex: 0,
    url: productUrl,
    readStatus: "complete",
    markdown: "Arroz extra 49 kg: S/200.",
  });
  expect(read.sources[1].observedAt).toMatch(/^\d{4}-/);
  await t.action(api.research.readProduct, args);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(
    (await t.query(api.research.list, { token }))[0].sources[1].markdown,
  ).toBe("Arroz extra 49 kg: S/200.");
  await expect(
    t.action(api.research.readProduct, { ...args, sourceIndex: 1 }),
  ).rejects.toThrow(/original source/);
});

test("multiline page titles retain their metadata label in every source reference", () => {
  const text = webSourceText({
    title: "Arroz extra\nS/ 10 por saco",
    markdown: "Consultar presentación y precio.",
  });
  expect(sourceEvidenceLines(text)).toEqual([
    "Page title: Arroz extra S/ 10 por saco",
    "Consultar presentación y precio.",
  ]);
});

test("read failure is retained and a repeated click cannot spend again", async () => {
  enable();
  const t = convexTest(schema, modules);
  const runId = await seed(t);
  const fetch = vi.fn(async () => {
    throw new Error("sensitive-provider-error");
  });
  vi.stubGlobal("fetch", fetch);
  const args = { token, runId, sourceIndex: 0, url: productUrl };
  const result = await t.action(api.research.readProduct, args);
  expect(result.sources[1].readStatus).toBe("failed");
  expect(JSON.stringify(result)).not.toContain("sensitive-provider-error");
  await t.action(api.research.readProduct, args);
  expect(fetch).toHaveBeenCalledTimes(1);
});

test("scrape refuses changed source URLs, including same-site redirects, and never calls a private URL", async () => {
  const fetch = vi.fn(async () =>
    Response.json({
      success: true,
      data: { markdown: "Arroz", metadata: { url: "https://other.com/arroz" } },
    }),
  );
  await expect(
    readProductPage("http://127.0.0.1/arroz", "test", fetch),
  ).rejects.toThrow(/is invalid/);
  expect(fetch).not.toHaveBeenCalled();
  await expect(readProductPage(productUrl, "test", fetch)).rejects.toThrow(
    /redirected elsewhere/,
  );
  expect(fetch).toHaveBeenCalledTimes(1);
  fetch.mockImplementation(async () =>
    Response.json({
      success: true,
      data: {
        markdown: "Otro arroz",
        metadata: { url: "https://supplier.com/producto/arroz-distinto" },
      },
    }),
  );
  await expect(readProductPage(productUrl, "test", fetch)).rejects.toThrow(
    /redirected elsewhere/,
  );
});

test("scrape rejects non-clean page statuses even when Firecrawl returns markdown", async () => {
  const moved = vi.fn(async () =>
    Response.json({
      success: true,
      data: {
        markdown: "Arroz extra 49 kg: S/200.",
        metadata: { sourceURL: productUrl, statusCode: 301 },
      },
    }),
  );
  await expect(readProductPage(productUrl, "test", moved)).rejects.toThrow(
    /usable content/,
  );
  const notModified = vi.fn(async () =>
    Response.json({
      success: true,
      data: {
        markdown: "Arroz extra 49 kg: S/200.",
        metadata: { sourceURL: productUrl, statusCode: 304 },
      },
    }),
  );
  await expect(
    readProductPage(productUrl, "test", notModified),
  ).resolves.toMatchObject({ markdown: "Arroz extra 49 kg: S/200." });
});

test("the real Agent receives the query and saves a grounded non-product assessment", async () => {
  enable();
  vi.stubEnv("OPENAI_API_KEY", "test");
  vi.stubEnv("OPENAI_EXTRACTION_MODEL", "test");
  const t = convexTest(schema, modules);
  const runId = await seed(t);
  const fetch = vi.fn(async (_input: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body));
    expect(JSON.stringify(body.input)).toContain("Arroz extra");
    expect(JSON.stringify(body.input)).toContain(productUrl);
    return Response.json({
      id: "resp_quality",
      output: [
        {
          type: "message",
          role: "assistant",
          id: "msg_quality",
          content: [
            {
              type: "output_text",
              text: JSON.stringify({
                analysis: {
                  kind: "catalog",
                  summary: "Elige una ficha de arroz.",
                  evidenceLineNumbers: [2],
                  warnings: [],
                },
                offer: noOffer,
              }),
              annotations: [],
            },
          ],
        },
      ],
    });
  });
  vi.stubGlobal("fetch", fetch);
  const args = { token, runId, sourceIndex: 0 };
  expect((await t.action(api.research.extract, args)).price.value).toBeNull();
  await t.action(api.research.extract, args);
  expect(fetch).toHaveBeenCalledTimes(1);
  const saved = (await t.query(api.research.list, { token }))[0].sources[0];
  expect(saved.analysis?.kind).toBe("catalog");
  expect(saved.inspection?.links[0].url).toBe(productUrl);
});

test("generation schema bounds references before accepting a structured model result", () => {
  const schema = boundedWebAnalysisSchema(12);
  const proposal = {
    analysis: {
      kind: "uncertain",
      summary: "Conflicting package descriptions",
      warnings: [],
      evidenceLineNumbers: [929],
    },
    offer: noOffer,
  };
  expect(schema.safeParse(proposal).success).toBe(false);
  expect(
    schema.safeParse({
      ...proposal,
      analysis: { ...proposal.analysis, evidenceLineNumbers: [12] },
    }).success,
  ).toBe(true);
});

test("web analysis keeps the published price but clears invented currency, attributes and approximate weight", () => {
  const source = "$109.99\nThis product is fresh\nApprox. 40 lb case";
  const result = validateWebAnalysis(
    {
      analysis: {
        kind: "product",
        summary: "Chicken case; confirm details.",
        warnings: [],
        evidenceLineNumbers: [1, 2],
      },
      offer: {
        ...noOffer,
        price: { value: "109.99", evidenceLineNumber: 1 },
        currency: { value: "USD", evidenceLineNumber: 1 },
        specification: {
          value: "Fresh hormone-free chicken",
          evidenceLineNumber: 2,
        },
        packageContent: { value: "40", evidenceLineNumber: 3 },
      },
    },
    source,
  );
  expect(result.offer.price.value).toBe("109.99");
  expect(result.offer.currency.value).toBeNull();
  expect(result.offer.specification.value).toBeNull();
  expect(result.offer.packageContent.value).toBeNull();
});

test("container counts do not become comparable product units", () => {
  const result = validateWebAnalysis(
    {
      analysis: {
        kind: "product",
        summary: "Rice in six pouches.",
        warnings: [],
        evidenceLineNumbers: [1],
      },
      offer: {
        ...noOffer,
        packageContent: { value: "6", evidenceLineNumber: 1 },
        packageUnit: { value: "unit", evidenceLineNumber: 1 },
        price: { value: "39.99", evidenceLineNumber: 2 },
      },
    },
    "Includes 6 pouches\nCurrent price $39.99",
  );
  expect(result.offer.packageContent.value).toBeNull();
  expect(result.offer.packageUnit.value).toBeNull();
  expect(result.offer.price.value).toBe("39.99");
});

test.each([
  [
    "Quantity88/CaseShipping Weight45 lb.Package Size88 CountPerishable TypeRefrigerated Foods",
    "88",
    "unit",
    "88",
  ],
  ["Gala apples in a 50 Count Gift Box", "50", "unit", "50"],
  ["Includes 6 count pouches", "6", "unit", null],
  ["Approx. 50 count box", "50", "unit", null],
  ["Shipping Weight 45 lb. Package Size 88 Count", "45", "lb", null],
])(
  "validates the cited quantity independently of neighboring labels: %s",
  (source, quantity, unit, expected) => {
    const result = validateWebAnalysis(
      {
        analysis: {
          kind: "product",
          summary: "Package evidence",
          warnings: [],
          evidenceLineNumbers: [1],
        },
        offer: {
          ...noOffer,
          packageContent: { value: quantity, evidenceLineNumber: 1 },
          packageUnit: { value: unit, evidenceLineNumber: 1 },
        },
      },
      source,
    );
    expect(result.offer.packageContent.value).toBe(expected);
  },
);
test.each([
  ["Current price is USDNow $3.24", "USD"],
  ["Current price $3.24", null],
])(
  "retains explicit compact currency but never infers it: %s",
  (source, expected) => {
    const result = validateWebAnalysis(
      {
        analysis: {
          kind: "product",
          summary: "Published price",
          warnings: [],
          evidenceLineNumbers: [1],
        },
        offer: {
          ...noOffer,
          price: { value: "3.24", evidenceLineNumber: 1 },
          currency: { value: "USD", evidenceLineNumber: 1 },
        },
      },
      source,
    );
    expect(result.offer.currency.value).toBe(expected);
  },
);

test("a literal quote cannot support a fabricated price or calculated package weight", () => {
  const result = validateWebAnalysis(
    {
      analysis: {
        kind: "product",
        summary: "Published product",
        warnings: [],
        evidenceLineNumbers: [1],
      },
      offer: {
        ...noOffer,
        price: { value: "8.99", evidenceLineNumber: 1 },
        packageContent: { value: "40", evidenceLineNumber: 2 },
        packageUnit: { value: "lb", evidenceLineNumber: 2 },
      },
    },
    "Price USD 9.99\nEight 5 lb bags per case",
  );
  expect(result.offer.price.value).toBeNull();
  expect(result.offer.packageContent.value).toBeNull();
});
