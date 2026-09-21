import { ArrowRight } from "lucide-react";
import { Button } from "./ui/Button";

/** A single entry point; the overview owns the shared work projection. */
export default function ContinueWork({ onOverview }: { onOverview: () => void }) {
  return <section className="continue-work">
    <h2>Continue your work</h2>
    <p>Review supplier replies, follow ongoing research and return to your saved studies.</p>
    <Button variant="secondary" onClick={onOverview}>Open sourcing overview<ArrowRight size={18} /></Button>
  </section>;
}
