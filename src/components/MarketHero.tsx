/** Editorial brand image. It never represents a listed supplier or market evidence. */
export default function MarketHero() {
  return (
    <figure className="market-portrait">
      <img
        className="market-portrait-photo"
        src="/brand/market-still-life.webp"
        alt=""
        width="1122"
        height="1402"
        fetchPriority="high"
      />
      <div className="portrait-note" aria-hidden="true">
        <img src="/brand/surtario-symbol.svg" width="28" height="28" alt="" />
        <span>
          From the market
          <br />to your kitchen.
        </span>
      </div>
      <div className="market-seal" aria-hidden="true">
        <svg viewBox="0 0 100 100" fill="none">
          <path
            d="M50 3 59 11 71 8 76 20 89 22 89 35 98 43 91 54 95 66 83 72 80 86 66 85 57 96 46 89 34 93 28 81 15 78 16 64 5 56 12 44 8 32 21 26 24 13 38 14Z"
            fill="currentColor"
          />
        </svg>
        <span>
          It starts
          <br />
          <strong>with good judgment</strong>
        </span>
      </div>
    </figure>
  );
}
