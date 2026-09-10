import { ExternalLink, ScanSearch } from "lucide-react";
import "../styles/source-quality.css";

export type SourceAnalysis = {
  kind: "product" | "catalog" | "contact" | "irrelevant" | "uncertain";
  summary: string;
  evidence: string[];
  warnings: string[];
};

export type SourceInspection = {
  state: "readable" | "unreadable" | "blocked" | "unrelated";
  reason: string | null;
  links: { url: string; label: string }[];
};

const kindCopy: Record<SourceAnalysis["kind"], string> = {
  product: "Ficha de producto",
  catalog: "Catálogo general",
  contact: "Contacto de proveedor",
  irrelevant: "Fuente no pertinente",
  uncertain: "Fuente por confirmar",
};

function safeUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:"
      ? parsed.href
      : null;
  } catch {
    return null;
  }
}

export function SourceQualitySummary({
  analysis,
}: {
  analysis: SourceAnalysis;
}) {
  return (
    <section
      className={`source-quality source-quality-${analysis.kind}`}
      aria-label="Análisis de la fuente"
    >
      <strong>{kindCopy[analysis.kind]}</strong>
      <p>{analysis.summary}</p>
      {analysis.evidence.length > 0 && (
        <details className="source-evidence">
          <summary>Ver evidencia ({analysis.evidence.length})</summary>
          <ul>
            {analysis.evidence.map((item, index) => (
              <li key={`${index}:${item}`}>“{item}”</li>
            ))}
          </ul>
        </details>
      )}
      {analysis.warnings.length > 0 && (
        <div className="source-warnings">
          <span>Qué falta confirmar</span>
          <ul>
            {analysis.warnings.map((item, index) => (
              <li key={`${index}:${item}`}>{item}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

export function ProductLinkReader({
  links,
  selectedUrl,
  reading,
  failed,
  onSelect,
  onRead,
}: {
  links: { url: string; label: string }[];
  selectedUrl: string;
  reading: boolean;
  failed: string;
  onSelect: (url: string) => void;
  onRead: () => void;
}) {
  const candidates = links.flatMap((link) => {
    const href = safeUrl(link.url);
    return href ? [{ ...link, href }] : [];
  });
  if (candidates.length === 0) return null;

  const current = candidates.some((link) => link.url === selectedUrl)
    ? selectedUrl
    : candidates[0].url;

  return (
    <div className="product-link-reader">
      <div>
        <strong>Posibles fichas del producto</strong>
        <p>
          Elige una página del mismo sitio. Leerla crea una fuente separada para
          revisar; no registra una compra.
        </p>
      </div>
      <label>
        Página a leer
        <select
          value={current}
          disabled={reading || Boolean(failed)}
          onChange={(event) => onSelect(event.target.value)}
        >
          {candidates.map((link) => (
            <option value={link.url} key={link.url}>
              {link.label || new URL(link.url).hostname}
            </option>
          ))}
        </select>
      </label>
      <a
        href={candidates.find((link) => link.url === current)?.href}
        target="_blank"
        rel="noopener noreferrer"
      >
        Abrir ficha candidata <ExternalLink size={14} />
      </a>
      <button
        type="button"
        className="button secondary"
        disabled={reading || Boolean(failed)}
        onClick={onRead}
      >
        <ScanSearch size={16} />
        {reading ? "Leyendo ficha…" : "Leer ficha del producto"}
      </button>
      {reading && (
        <p className="field-hint" role="status" aria-live="polite">
          Leyendo la ficha seleccionada. No se repetirá automáticamente.
        </p>
      )}
      {failed && (
        <p className="notice error" role="alert">
          {failed}
        </p>
      )}
    </div>
  );
}
