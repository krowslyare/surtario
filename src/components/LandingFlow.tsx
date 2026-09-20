import { useId, useRef, useState } from "react";
import { ArrowDown, BookmarkCheck, Check, FileText, FolderClock, MapPin, MessageSquare, Search } from "lucide-react";
import type { previewFreightDecision } from "../domain/missingResolution";

const steps = [
  { title: "Find your options", detail: "An ingredient and a delivery area." },
  { title: "Keep the evidence", detail: "The source stays with the finding." },
  { title: "Clear up the unknowns", detail: "A useful question, ready to review." },
  { title: "Decide when you’re ready", detail: "See what the whole order costs." },
];
const usd = (cents: number) => `USD ${(cents / 100).toFixed(2)}`;

export default function LandingFlow({ preview }: { preview: ReturnType<typeof previewFreightDecision> }) {
  const [step, setStep] = useState(0);
  const [interacted, setInteracted] = useState(false);
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  function select(next: number) {
    setInteracted(true);
    setStep(next);
    buttons.current[next]?.focus();
  }
  return (
    <section id="how-it-works" tabIndex={-1} className="landing-flow" aria-labelledby={`${id}-heading`}>
      <div className="landing-section-intro">
        <h2 id={`${id}-heading`}>From “where can I find it?”<br />to “here’s my next step.”</h2>
        <p>Start with one ingredient. Build a picture of your options, then take the next step with the evidence in front of you.</p>
      </div>
      <div className="landing-flow-layout">
        <div className="landing-flow-tabs" role="tablist" aria-label="The Surtario sourcing flow" aria-orientation="vertical">
          {steps.map((item, index) => (
            <button key={item.title} type="button" role="tab" id={`${id}-tab-${index}`}
              aria-selected={step === index} aria-controls={`${id}-panel-${index}`} tabIndex={step === index ? 0 : -1}
              ref={el => { buttons.current[index] = el; }} onClick={() => select(index)}
              onKeyDown={event => {
                const next = event.key === "ArrowDown" || event.key === "ArrowRight" ? (index + 1) % steps.length
                  : event.key === "ArrowUp" || event.key === "ArrowLeft" ? (index + steps.length - 1) % steps.length
                  : event.key === "Home" ? 0 : event.key === "End" ? steps.length - 1 : null;
                if (next !== null) { event.preventDefault(); select(next); }
              }}>
              <span className="landing-step-number" aria-hidden="true">{index + 1}</span>
              <span><strong>{item.title}</strong><small>{item.detail}</small></span>
            </button>
          ))}
        </div>
        <div className="landing-flow-panels">
          <div className="landing-flow-stage" data-interacted={interacted}>
          {steps.map((item, index) => (
            <div key={item.title} role="tabpanel" id={`${id}-panel-${index}`} aria-labelledby={`${id}-tab-${index}`}
              tabIndex={step === index ? 0 : -1} aria-hidden={step !== index} inert={step !== index ? true : undefined}
              data-active={step === index} className="landing-flow-panel">
              {index === 0 && <>
                <div className="landing-flow-copy"><h3>Look beyond the first price.</h3><p>Find published offers and distributors worth asking. A supplier without a price can still be a useful lead.</p></div>
                <div className="landing-search-illustration">
                  <div className="landing-search-query"><span><Search size={20} aria-hidden="true" /> Long-grain white rice</span><span><MapPin size={17} aria-hidden="true" /> Portland, OR</span></div>
                  <ul className="landing-supplier-rows">
                    <li><div><strong>Cascade Pantry</strong><span>40 lb pack · delivery included</span></div><b>USD 40.00</b></li>
                    <li><div><strong>Rose City</strong><span>10 lb pack · delivery to confirm</span></div><b>USD 8.75</b></li>
                    <li><div><strong>Northwest Restaurant Goods</strong><span>Wholesale distributor</span></div><span className="landing-pending">Price on request</span></li>
                  </ul>
                  <p className="landing-illustration-note">Fictional suppliers and sample offers. No quantity needed to explore.</p>
                </div>
              </>}
              {index === 1 && <>
                <div className="landing-flow-copy"><h3>A shortlist with the details attached.</h3><p>Keep the offers, contacts and references that matter. Save your study to return to the source, rather than start the search again.</p></div>
                <div className="landing-evidence-illustration">
                  <div className="landing-evidence-source"><FileText size={25} aria-hidden="true" /><div><strong>Rose City · rice listing</strong><span>Sample catalog source</span></div><BookmarkCheck size={22} aria-hidden="true" /></div>
                  <dl><div><dt>Product</dt><dd>Long-grain white rice</dd></div><div><dt>Published offer</dt><dd>USD 8.75 / 10 lb pack</dd></div><div><dt>Delivery cost</dt><dd className="landing-pending-text">Still to confirm</dd></div></dl>
                  <div className="landing-kept-evidence"><Check size={16} aria-hidden="true" /> Source, review date and your selection stay together.</div>
                  <div className="landing-resume-line"><FolderClock size={20} aria-hidden="true" /><span><strong>Rice · Portland</strong><small>Saved study · ready to resume</small></span></div>
                </div>
              </>}
              {index === 2 && <>
                <div className="landing-flow-copy"><h3>Turn a missing detail into a clear question.</h3><p>Research public information or prepare a supplier inquiry with the context already attached. Review the draft before anything is sent.</p></div>
                <div className="landing-inquiry-illustration">
                  <div className="landing-message-label"><MessageSquare size={18} aria-hidden="true" /><span>Prepared question · for your review</span></div>
                  <blockquote>“For 40 lb of long-grain white rice delivered in Portland, can you confirm delivery for {usd(preview.finding.maxFreightCents)} or less?”</blockquote>
                  <ArrowDown className="landing-reply-arrow" size={22} aria-hidden="true" />
                  <div className="landing-sample-reply"><span>Illustrative reply</span><p>“Delivery would be {usd(preview.freightCents)} for this order.”</p></div>
                  <p className="landing-illustration-note">You review the reply and confirm the terms. A draft is not a sent message.</p>
                </div>
              </>}
              {index === 3 && <>
                <div className="landing-flow-copy"><h3>Compare the order, not just the unit price.</h3><p>When you have a quantity in mind, calculate whole packs, delivery, excess and cash outlay. Unconfirmed costs stay pending.</p></div>
                <div className="landing-decision-illustration">
                  <p className="landing-order-need">Your requirement <strong>40 lb of rice</strong></p>
                  <table><caption className="sr-only">Illustrative order comparison with the sample delivery cost confirmed</caption><thead><tr><th scope="col">For this order</th><th scope="col">Cascade Pantry</th><th scope="col">Rose City</th></tr></thead><tbody>
                    <tr><th scope="row">Whole packs</th><td>1 × 40 lb</td><td>4 × 10 lb</td></tr>
                    <tr><th scope="row">Goods</th><td>{usd(preview.finding.evidence.benchmarkTotalCents)}</td><td>{usd(preview.finding.evidence.pendingSubtotalCents)}</td></tr>
                    <tr><th scope="row">Delivery</th><td>Included</td><td>{usd(preview.freightCents)}</td></tr>
                    <tr><th scope="row">Excess</th><td>0 lb</td><td>0 lb</td></tr>
                    <tr className="landing-order-total"><th scope="row">Order total</th><td>{usd(preview.finding.evidence.benchmarkTotalCents)}</td><td>{usd(preview.totalCents)}</td></tr>
                  </tbody></table>
                  <p className="landing-illustration-note">Sample final, tax-inclusive amounts. Selecting an offer does not place an order.</p>
                </div>
              </>}
            </div>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
}
