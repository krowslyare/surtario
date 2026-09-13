import { useState } from "react";
import { ArrowUpRight, Check, CircleHelp, RotateCcw } from "lucide-react";
import Brand from "./components/Brand";
import { previewFreightDecision } from "./domain/missingResolution";
import type { SupplierOffer } from "./domain/procurement";
import "./styles/landing.css";

const request = {
  ingredient: "Rice", specification: "Long-grain white rice",
  quantity: 40, unit: "lb" as const,
};
const offers: SupplierOffer[] = [
  {
    id: "landing-cascade", supplier: "Cascade Pantry", ingredient: request.ingredient,
    specification: request.specification, packageContent: 40, packageUnit: "lb",
    priceCents: 4000, currency: "USD", minimumPackages: 1, freightCents: 0,
    taxStatus: "included", deliveryConfirmed: true,
  },
  {
    id: "landing-rose", supplier: "Rose City", ingredient: request.ingredient,
    specification: request.specification, packageContent: 10, packageUnit: "lb",
    priceCents: 875, currency: "USD", minimumPackages: 1, freightCents: null,
    taxStatus: "included", deliveryConfirmed: true,
  },
];
const preview = previewFreightDecision(request, offers, {
  priority: "cash", budgetCents: null, dailyUsage: null, stockQuantity: null,
  maxCoverageDays: null, preferredOfferId: null,
}, "landing-rose", 300);
const usd = (cents: number) => `USD ${(cents / 100).toFixed(2)}`;

export default function Landing() {
  const [answered, setAnswered] = useState(false);
  return (
    <div className="landing">
      <a className="skip-link" href="#landing-main">Skip to content</a>
      <header className="landing-header">
        <Brand compact />
        <a className="landing-enter" href="/?view=market">
          Open workspace <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </header>
      <main id="landing-main" className="landing-main" tabIndex={-1}>
        <div className="landing-intro">
          <h1>Good ingredients.<br />Better decisions.</h1>
          <p className="landing-promise">
            Your kitchen deserves more than a price list. Find suppliers,
            compare the full cost, and know what to ask before you buy.
          </p>
          <a className="button primary landing-cta" href="/?view=market">
            Start sourcing <ArrowUpRight size={20} aria-hidden="true" />
          </a>
          <p className="landing-entry-note">Start with an ingredient. No spreadsheet required.</p>
          <div className="landing-principle">
            <img src="/brand/surtario-symbol.svg" width="32" height="32" alt="" />
            <p>From the first question<br />to a decision you can explain.</p>
          </div>
        </div>
        <div className="landing-scene">
          <img className="landing-photo" src="/brand/market-still-life.webp"
            alt="Rice, fresh vegetables and limes in a burgundy market bag"
            width="1122" height="1402" fetchPriority="high" />
          <section className="landing-slip" aria-label="Interactive purchasing example">
            <div className="landing-slip-heading">
              <h2>One answer.<br />A clearer next step.</h2>
              <span>Rice<br />40 lb</span>
            </div>
            <div className="landing-quotes">
              <div><span>Cascade Pantry</span><span>{usd(preview.finding.evidence.benchmarkTotalCents)}<small>delivery included</small></span></div>
              <div><span>Rose City</span><span>{usd(preview.finding.evidence.pendingSubtotalCents)}<small>delivery not quoted</small></span></div>
            </div>
            <p className="landing-question">“Can you deliver for {usd(preview.finding.maxFreightCents)} or less?”</p>
            <div className="landing-answer" data-answered={answered} aria-live="polite" aria-atomic="true">
              <div className="landing-answer-line">
                {answered ? <Check size={18} aria-hidden="true" /> : <CircleHelp size={18} aria-hidden="true" />}
                <strong>{answered ? `Sample reply: ${usd(preview.freightCents)} delivery.` : "The delivery cost could change your choice."}</strong>
              </div>
              <p>{answered
                ? `Rose City totals ${usd(preview.totalCents)} — ${usd(Math.abs(preview.differenceCents))} below the complete alternative.`
                : "Until it’s confirmed, the order total stays pending."}</p>
            </div>
            <button className="landing-reveal" type="button" aria-pressed={answered}
              onClick={() => setAnswered(!answered)}>
              {answered ? <><RotateCcw size={16} aria-hidden="true" /> Replay example</> : <>Reveal sample reply <ArrowUpRight size={17} aria-hidden="true" /></>}
            </button>
            <p className="landing-sample-note">Illustrative suppliers and final, tax-inclusive amounts.</p>
          </section>
        </div>
      </main>
      <footer className="landing-footer">
        <span>Sourcing for your kitchen.</span>
        <p>Sources stay visible. Missing terms stay pending. You decide.</p>
      </footer>
    </div>
  );
}
