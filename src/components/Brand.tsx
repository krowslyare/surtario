/** Shared wordmark: the brand remains outside procurement data and session keys. */
export default function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className={`brand${compact ? " brand-compact" : ""}`}
      aria-label="Surtario, sourcing for your kitchen"
    >
      <img
        className="brand-symbol"
        src="/brand/surtario-symbol.svg"
        width="48"
        height="48"
        alt=""
      />
      <span className="brand-wordmark">
        surtario<span className="brand-period">.</span>
      </span>
      {!compact && (
        <span className="brand-description">
          Sourcing for
          <br />
          your kitchen
        </span>
      )}
    </div>
  );
}
