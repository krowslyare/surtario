import { useState } from "react";
import { ArrowRight, Copy, MessageSquare } from "lucide-react";
import { resolveMissingConditions, compareFreightScenario } from "../domain/missingResolution";
import type { ProcurementRequest, SupplierOffer } from "../domain/procurement";
import { money, parseCents } from "../numbers";
import { Button } from "./ui/Button";
import { Dialog } from "./Dialog";

export default function MissingConditionInsight({ request, offers, onEdit }: {
  request: ProcurementRequest;
  offers: SupplierOffer[];
  onEdit: (id: string) => void;
}) {
  const resolutions = resolveMissingConditions(request, offers);
  const [questionId, setQuestionId] = useState<string | null>(null);
  const [freight, setFreight] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  // The parent keys this component by the comparison fingerprint to discard stale scenarios.
  const question = resolutions.find(item => item.offerId === questionId);
  if (!resolutions.length) return null;
  return <section className="missing-insight" aria-label="Resolve missing terms">
    <div className="missing-insight-heading"><MessageSquare size={22} aria-hidden="true" /><h2>One question could change your decision</h2></div>
    {resolutions.map(item => <div key={item.offerId} className="missing-insight-row">
      <div>
        <h3>{item.supplier}</h3>
        <p>{item.outcome === "can-match"
          ? <>Delivery must be <strong>{money(item.maxFreightCents, item.currency)} or less</strong> to match the lowest complete order total.</>
          : <>Its goods already cost <strong>{money(-item.maxFreightCents, item.currency)} more</strong> than the lowest complete order. Free delivery alone would not close the gap.</>}
        </p>
        <p className="field-hint">A calculated boundary, not a shipping quote. The offer stays pending until its terms are confirmed.</p>
      </div>
      <Button variant="secondary" onClick={() => {setQuestionId(item.offerId);setFreight("");setCopyStatus("");}}>Prepare supplier question <ArrowRight size={16} aria-hidden="true" /></Button>
    </div>)}
    {question && <Dialog title="Resolve the delivery cost" onClose={() => setQuestionId(null)}>
      <p>{question.questionDraft}</p>
      <label className="field"><span>Try a delivery amount ({question.currency})</span><input inputMode="decimal" value={freight} onChange={event=>setFreight(event.target.value)} placeholder="Hypothetical amount" /></label>
      {freight.trim() && (()=>{
        const cents=parseCents(freight);
        const offer=offers.find(item=>item.id===question.offerId)!;
        if(cents === null || !Number.isSafeInteger(cents) || cents < 0) return <p role="alert">Enter a non-negative amount with at most two decimals.</p>;
        const scenario=compareFreightScenario(request,offer,cents);
        const total=scenario.after.totalCents;
        if(total === null) return <p role="alert">This scenario still has incomplete terms.</p>;
        const difference=total-question.evidence.benchmarkTotalCents;
        return <div className="notice info" role="status"><strong>Hypothetical order: {money(total, question.currency)}</strong><p>{difference===0 ? "Matches the lowest complete order." : `${money(Math.abs(difference),question.currency)} ${difference<0 ? "below" : "above"} the lowest complete order.`} No offer has been changed.</p></div>;
      })()}
      <div className="dialog-actions">
        <Button variant="secondary" onClick={async()=>{try {await navigator.clipboard.writeText(question.questionDraft);setCopyStatus("Question copied. No message was sent.");} catch {setCopyStatus("Copy is unavailable. Select and copy the question above.");}}}><Copy size={16} aria-hidden="true" />Copy question</Button>
        <Button variant="primary" onClick={()=>{const id=question.offerId;setQuestionId(null);onEdit(id);}}>Enter confirmed terms</Button>
      </div>
      <p role="status" className="field-hint">{copyStatus}</p>
    </Dialog>}
  </section>;
}
