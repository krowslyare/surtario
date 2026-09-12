import type { MarketResult, MarketSource } from "../src/domain/market";
const source = (title: string, evidence: string): MarketSource => ({
  title,
  evidence,
  url: null,
  observedAt: "2026-09-07",
  publishedAt: null,
  simulated: true,
});
/** Fictional suppliers and prices. These fixtures never represent live web search results. */
export const marketExamples: MarketResult[] = [
  {
    id: "catalog-a",
    kind: "catalog",
    supplier: "Distribuidor A · ejemplo",
    ingredient: "Arroz",
    description: "Abarrotes secos. Arroz blanco extra en saco de 18 kg.",
    specification: "Arroz blanco extra",
    region: "Lima",
    packageContent: 18,
    packageUnit: "kg",
    priceCents: 8000,
    currency: "PEN",
    minimumPackages: null,
    source: source(
      "Ficha de arroz A",
      "Arroz blanco extra. Saco de 18 kg: S/80.00. La ficha de ejemplo no informa impuestos, mínimo, stock ni reparto.",
    ),
  },
  {
    id: "catalog-b",
    kind: "catalog",
    supplier: "Distribuidor B · ejemplo",
    ingredient: "Arroz",
    description: "Abarrotes secos. Arroz blanco extra en bolsa de 1 kg.",
    specification: "Arroz blanco extra",
    region: "Lima",
    packageContent: 1,
    packageUnit: "kg",
    priceCents: 500,
    currency: "PEN",
    minimumPackages: null,
    source: source(
      "Ficha de arroz B",
      "Arroz blanco extra. Bolsa de 1 kg: S/5.00. La ficha de ejemplo no informa impuestos, mínimo, stock ni reparto.",
    ),
  },
  {
    id: "distributor-c",
    kind: "distributor",
    supplier: "Distribuidor C · ejemplo",
    ingredient: "Arroz",
    description:
      "Distribuidor de abarrotes secos para restaurantes. Arroz y otros granos; presentaciones a consultar.",
    region: "Lima",
    contact: {
      channel: "email",
      value: "ventas@distribuidor-c.example",
      verified: false,
    },
    source: source(
      "Directorio de ejemplo C",
      "Distribuidor de abarrotes en Lima. Productos: arroz y granos. Consultar precios y cobertura por correo comercial. Datos ficticios, no contactar.",
    ),
  },
  {
    id: "reference-rice",
    kind: "reference",
    supplier: "Boletín ilustrativo",
    ingredient: "Arroz",
    description:
      "Referencia de mercado para arroz. Condiciones mayoristas distintas a las de un catálogo.",
    region: "Lima",
    note: "Una referencia general aporta contexto; no es una oferta comprable ni un distribuidor.",
    source: source(
      "Referencia general de ejemplo",
      "Ejemplo de una referencia de mercado, sin cifras: no se consultó un boletín real y no se calcula un rango ni una tendencia.",
    ),
  },
];

const usSource = (title: string, evidence: string): MarketSource => ({
  title,
  evidence,
  url: null,
  observedAt: "2026-09-12",
  publishedAt: null,
  simulated: true,
});

/** Fictional US suppliers and USD prices; these are not live market claims. */
export const usMarketExamples: MarketResult[] = [
  {
    id: "us-catalog-a",
    kind: "catalog",
    supplier: "Cascade Pantry Supply · fictional example",
    ingredient: "Rice",
    description: "Dry goods. Long-grain white rice in a 25 lb bag.",
    specification: "Long-grain white rice",
    region: "Portland, OR, US",
    packageContent: 25,
    packageUnit: "lb",
    priceCents: 2000,
    currency: "USD",
    minimumPackages: null,
    source: usSource(
      "Fictional rice listing A",
      "Synthetic example only. Long-grain white rice, 25 lb bag: USD 20.00. Taxes, minimum order, stock, freight, and delivery are not stated.",
    ),
  },
  {
    id: "us-catalog-b",
    kind: "catalog",
    supplier: "Rose City Foodservice · fictional example",
    ingredient: "Rice",
    description: "Dry goods. Long-grain white rice in a 50 lb bag.",
    specification: "Long-grain white rice",
    region: "Portland, OR, US",
    packageContent: 50,
    packageUnit: "lb",
    priceCents: 3500,
    currency: "USD",
    minimumPackages: null,
    source: usSource(
      "Fictional rice listing B",
      "Synthetic example only. Long-grain white rice, 50 lb bag: USD 35.00. Taxes, minimum order, stock, freight, and delivery are not stated.",
    ),
  },
  {
    id: "us-distributor-c",
    kind: "distributor",
    supplier: "Northwest Restaurant Goods · fictional example",
    ingredient: "Rice",
    description: "Fictional restaurant dry-goods distributor; package and price require confirmation.",
    region: "Portland, OR, US",
    contact: {
      channel: "email",
      value: "sales@northwest-restaurant-goods.example",
      verified: false,
    },
    source: usSource(
      "Fictional distributor directory C",
      "Synthetic directory entry for a Portland-area dry-goods distributor. No live source was consulted; do not contact.",
    ),
  },
  {
    id: "us-reference-rice",
    kind: "reference",
    supplier: "Illustrative US market note",
    ingredient: "Rice",
    description: "General rice market context with terms that may differ from supplier offers.",
    region: "Portland, OR, US",
    note: "This synthetic reference is context only, not a purchasable offer or a live price.",
    source: usSource(
      "Fictional US rice reference",
      "Synthetic market-reference example without live figures or trend claims.",
    ),
  },
];

export const allMarketExamples: MarketResult[] = [
  ...marketExamples,
  ...usMarketExamples,
];

export const marketExampleContexts = [
  {
    ingredient: "Arroz",
    terms: ["arroz", "abarrotes", "abarrotes secos"],
    region: "Lima",
    results: marketExamples,
  },
  {
    ingredient: "Rice",
    terms: ["rice", "dry goods"],
    region: "Portland, OR, US",
    results: usMarketExamples,
  },
] as const;

export function findMarketExampleContext(term: string, region: string) {
  const normalizedTerm = term.trim().toLowerCase();
  return marketExampleContexts.find(
    (context) =>
      context.region === region &&
      context.terms.some((acceptedTerm) => acceptedTerm === normalizedTerm),
  );
}

export function findMarketExampleContextByIds(ids: string[]) {
  if (!ids.length) return undefined;
  return marketExampleContexts.find((context) =>
    ids.every((id) => context.results.some((item) => item.id === id)),
  );
}
