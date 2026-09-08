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
