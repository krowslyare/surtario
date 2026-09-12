export default function Brand() {
  return (
    <div className="brand">
      <span className="brand-icon" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="28" height="28" fill="none">
          <path
            d="M6 12h20v14H6zM6 19h20M12 12v14M20 12v14M10 12V8h12v4M14 8V5h4v3"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      <span>
        Purchasing <span className="brand-description">for restaurants</span>
      </span>
    </div>
  );
}
