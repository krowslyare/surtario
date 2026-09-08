import type {
  ExtractedOffer,
  ExtractionSource,
} from "../src/domain/extraction";
export const extractionSource: ExtractionSource = {
  title: "Cotización ilustrativa de arroz",
  text: "Distribuidora de ejemplo\nArroz blanco extra\nSaco: S/ 80.00\nNo se indica el peso del saco, pedido mínimo ni condiciones de reparto.",
  observedAt: "2026-09-08",
  simulated: true,
};
export const extractionExample: ExtractedOffer = {
  supplier: {
    value: "Distribuidora de ejemplo",
    evidence: "Distribuidora de ejemplo",
  },
  ingredient: { value: "Arroz", evidence: "Arroz blanco extra" },
  specification: { value: "Blanco extra", evidence: "Arroz blanco extra" },
  packageContent: { value: null, evidence: null },
  packageUnit: { value: null, evidence: null },
  price: { value: "80.00", evidence: "Saco: S/ 80.00" },
  currency: { value: "PEN", evidence: "S/ 80.00" },
};
