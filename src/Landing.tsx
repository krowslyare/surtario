import { scrollToAnchor } from "./scroll";
import { markWorkspaceEntry } from "./workspaceCheckpoint";
import { useState } from "react";
import { ArrowDown, ArrowUpRight, Check, ChevronDown, CircleHelp, RotateCcw } from "lucide-react";
import Brand from "./components/Brand";
import LandingFlow from "./components/LandingFlow";
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
        <a className="landing-enter" href="/?view=market" onClick={markWorkspaceEntry}>
          Open workspace <ArrowUpRight size={18} aria-hidden="true" />
        </a>
      </header>
      <main id="landing-main" className="landing-main" tabIndex={-1}>
        <div className="landing-hero">
        <div className="landing-intro">
          <h1>Good ingredients.<br />Better decisions.</h1>
          <p className="landing-promise">
            Ingredient sourcing for your restaurant. Find suppliers, keep the
            evidence, and know what to ask before you buy.
          </p>
          <a className="button primary landing-cta" href="/?view=market" onClick={markWorkspaceEntry}>
            Start sourcing <ArrowUpRight size={20} aria-hidden="true" />
          </a>
          <p className="landing-entry-note">Start with an ingredient. No spreadsheet required.</p>
          <div className="landing-principle">
            <img src="/brand/surtario-symbol.svg" width="32" height="32" alt="" />
            <a href="#how-it-works" onClick={scrollToAnchor}>See how Surtario works <ArrowDown size={17} aria-hidden="true" /></a>
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
        </div>
        <LandingFlow preview={preview} />
        <section className="landing-control" aria-labelledby="landing-control-title">
          <div className="landing-control-statement">
            <h2 id="landing-control-title">The evidence stays close. The decision stays yours.</h2>
            <img className="landing-control-symbol" src="/brand/surtario-symbol.svg" width="48" height="48" alt="" loading="lazy" />
          </div>
          <div className="landing-control-details">
            <div><h3>Useful before you’re ready to buy.</h3><p>Explore an ingredient, build a shortlist or prepare a question. You don’t need a recipe, purchase history or order quantity to begin.</p></div>
            <div><h3>Unknown means unknown.</h3><p>Missing delivery, taxes or pack sizes remain visible. Suggested details need your review before they become confirmed terms.</p></div>
            <div><h3>Pick up where you left off.</h3><p>Save studies and calculations, then find them alongside supplier follow-ups in “Continue your work”. Saved access stays tied to this browser.</p></div>
          </div>
        </section>
        <section className="landing-start" aria-labelledby="landing-start-title">
          <div className="landing-demo-card">
            <img className="landing-demo-backdrop" src="/brand/sourcing-cta.webp" width="2172" height="724" alt="" loading="lazy" decoding="async" />
            <div className="landing-start-copy">
              <h2 id="landing-start-title">Try Surtario with<br />one ingredient.</h2>
              <p>Find suppliers, clarify missing details and calculate what your order will cost.</p>
              <a className="button primary landing-cta" href="/?view=market" onClick={markWorkspaceEntry}>Start sourcing <ArrowUpRight size={20} aria-hidden="true" /></a>
              <span className="landing-entry-note">No recipes or purchase history needed.</span>
            </div>
          </div>
          <div className="landing-faq" aria-label="Questions about Surtario">
            <h3>Questions about Surtario</h3>
            <div className="landing-faq-items">
            <details><summary>How does Surtario compare offers?<ChevronDown size={18} aria-hidden="true" /></summary><p>Surtario puts pack sizes, minimum quantities and unit prices on the same footing. Add the quantity you need to see whole packs, excess and the order total. Unconfirmed delivery costs or taxes stay visible as pending.</p></details>
            <details><summary>Will Surtario send messages or place orders?<ChevronDown size={18} aria-hidden="true" /></summary><p>You stay in control. Supplier inquiries begin as drafts for you to review, and sending requires your confirmation. Calculating costs or choosing an offer never places an order.</p></details>
            <details><summary>Can I return to my work later?<ChevronDown size={18} aria-hidden="true" /></summary><p>Yes. Save your study or calculation and return through “Continue your work”, alongside your supplier follow-ups. Use the same browser to pick up where you left off; clearing its site data removes access to saved work.</p></details>
            </div>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <span>Sourcing for your kitchen.</span>
        <p>Sources stay visible. Missing terms stay pending. You decide.</p>
      </footer>
    </div>
  );
}
