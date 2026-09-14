import { useState, type CSSProperties } from "react";
import { Check, Copy, Download, Bookmark } from "lucide-react";
import { Select } from "./components/ui/Select";
import { Disclosure } from "./components/ui/Disclosure";
import { SegmentedControl } from "./components/ui/SegmentedControl";
import { Dialog } from "./components/Dialog";
import Brand from "./components/Brand";
import "./styles/brand-guide.css";

const palette = [
  {
    name: "Aubergine",
    hex: "#42202D",
    role: "The brand voice",
    light: true,
  },
  { name: "Radish", hex: "#EEC6D0", role: "A welcoming touch", light: false },
  { name: "Chili", hex: "#BA3527", role: "An accent with character", light: true },
  { name: "Lime", hex: "#E4EF9B", role: "A fresh detail", light: false },
  {
    name: "Porcelain",
    hex: "#FAFAF7",
    role: "Room to work",
    light: false,
  },
] as const;

export default function BrandGuide() {
  const [variant, setVariant] = useState<"dark" | "light" | "mono">("dark");
  const [copied, setCopied] = useState("");
  const [selected, setSelected] = useState(false);
  const [sampleUnit, setSampleUnit] = useState("");
  const [sampleDialog, setSampleDialog] = useState(false);
  async function copyColor(hex: string) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopied(`Copied: ${hex}`);
    } catch {
      setCopied(`Copy this color: ${hex}`);
    }
  }
  return (
    <>
      <a className="skip-link" href="#brand-story">
        Skip to the brand story
      </a>
      <header className="topbar">
        <Brand />
        <a className="button secondary" href="/">
          Open Surtario
        </a>
      </header>
      <main className="brand-guide">
        <div className="brand-guide-intro">
          <p>Product identity / Surtario 1.2</p>
          <a
            className="button text-button"
            href="/brand/surtario-brand-kit.zip"
            download
          >
            <Download size={16} /> Download original brand kit
          </a>
        </div>
        <section
          className="brand-manifesto"
          id="brand-story"
          aria-labelledby="brand-story-title"
        >
          <div className="brand-manifesto-copy">
            <img
              className="manifesto-wordmark"
              src="/brand/surtario-wordmark-light.svg"
              alt="Surtario"
              width="400"
              height="120"
            />
            <h1 id="brand-story-title">
              Every kitchen starts
              <br />
              at the market.
            </h1>
            <p>
              Before the heat come the ingredients. And before the ingredients
              come the questions: where they come from, what they cost, and
              how they reach your kitchen.
            </p>
            <p>
              Surtario helps you prepare for every service by sourcing with care.
              Gather evidence, understand your options, and plan your next
              purchase with clear terms.
            </p>
            <span className="manifesto-signature">
              Good judgment. Good ingredients.
            </span>
          </div>
          <img
            className="manifesto-photo"
            src="/brand/market-still-life.webp"
            alt="Rice, chilies, tomatoes, and limes on a pink surface; generated brand photography."
            width="1122"
            height="1402"
          />
        </section>

        <section className="brand-chapter" aria-labelledby="brand-name-title">
          <div>
            <h2 id="brand-name-title">
              Stock the kitchen.
              <br />
              Ask good questions.
            </h2>
          </div>
          <div className="brand-prose">
            <p>
              <strong>Surtario</strong> takes its name from the Spanish verb
              <em> surtir</em>: to supply. Every ingredient has a pack size, an
              origin, and a set of terms. Understanding them comes before choosing.
            </p>
            <p>
              <strong>Sourcing for your kitchen</strong> describes our purpose.
              We speak to purchasing managers and kitchen teams who need to
              understand an offer before choosing it.
            </p>
            <p className="brand-small">
              You can explore without inventory, your own documents, or purchase
              history. A market study starts with a question.
            </p>
          </div>
        </section>

        <section className="brand-colors" aria-labelledby="brand-colors-title">
          <div className="brand-section-title">
            <h2 id="brand-colors-title">A palette with an appetite.</h2>
            <p>Select a color to copy it.</p>
          </div>
          <div className="brand-swatches">
            {palette.map((color) => (
              <button
                key={color.hex}
                className={`brand-swatch${color.light ? " light-ink" : ""}`}
                style={{ "--swatch": color.hex } as CSSProperties}
                onClick={() => void copyColor(color.hex)}
                aria-label={`Copy ${color.name}, ${color.hex}`}
              >
                <span className="swatch-name">
                  {color.name}
                  <Copy size={16} />
                </span>
                <span className="swatch-role">{color.role}</span>
                <span className="swatch-hex">{color.hex}</span>
              </button>
            ))}
          </div>
          <p className="brand-copy-status" role="status">
            {copied}
          </p>
          <p className="brand-small">
            Porcelain and white make room for reading. Aubergine leads; pink
            and chili add character. Lime appears in the details. Brand colors
            never rate suppliers or replace written status labels.
          </p>
        </section>

        <section className="brand-chapter" aria-labelledby="brand-logo-title">
          <div>
            <h2 id="brand-logo-title">
              A familiar symbol,
              <br />
              wherever you return.
            </h2>
            <p className="brand-small">
              A round bowl and two grains: the beginning of what reaches the
              kitchen. The vector wordmark retains its shape without depending
              on an installed font.
            </p>
            <SegmentedControl
              label="Wordmark variant"
              value={variant}
              onValueChange={setVariant}
              options={
                [
                  { value: "dark", label: "Color" },
                  { value: "light", label: "Reversed" },
                  { value: "mono", label: "One color" },
                ] as const
              }
            />
            <a
              className="button text-button"
              href={`/brand/surtario-wordmark-${variant}.svg`}
              download
            >
              <Download size={16} /> Download SVG wordmark
            </a>
          </div>
          <div className={`brand-logo-proof proof-${variant}`}>
            <img
              className="proof-symbol"
              src={`/brand/surtario-symbol${variant === "light" ? "-light" : variant === "mono" ? "-mono" : ""}.svg`}
              width="100"
              height="100"
              alt="Surtario symbol"
            />
            <img
              className="proof-wordmark"
              src={`/brand/surtario-wordmark-${variant}.svg`}
              width="360"
              height="140"
              alt={`Surtario wordmark, ${variant === "light" ? "reversed" : variant === "mono" ? "one color" : "color"}`}
            />
            <span>Sourcing for your kitchen</span>
          </div>
        </section>

        <section className="brand-type" aria-labelledby="brand-type-title">
          <div className="brand-section-title">
            <h2 id="brand-type-title">Character in the voice. Clarity on the page.</h2>
          </div>
          <div className="brand-type-pair">
            <div className="display-specimen">
              <p>Bricolage Grotesque / Headlines</p>
              <strong>
                Rice, chili
                <br />and a good eye.
              </strong>
              <span>An expressive voice for the big ideas.</span>
            </div>
            <div className="body-specimen">
              <p>Manrope / Interface</p>
              <h3>The terms, on the table.</h3>
              <p>
                A 25 lb bag. An example unit price, preserved source evidence,
                and delivery still to be confirmed.
              </p>
              <strong>
                USD 0.80 <small>/ lb</small>
              </strong>
              <span>
                Explicit currency. Tabular figures. Visible unknowns.
              </span>
            </div>
          </div>
        </section>

        <section className="brand-chapter" aria-labelledby="brand-motion-title">
          <div>
            <h2 id="brand-motion-title">
              Motion
              <br />
              that responds.
            </h2>
            <p className="brand-small">
              Selections respond in 180 ms. Dialogs enter in 200 ms. The image
              appears once over 500 ms. No loops or counting money from zero;
              reduced-motion preferences are respected.
            </p>
          </div>
          <div className="brand-motion-example">
            <p className="brand-small">
              Try the interaction; this does not save a study.
            </p>
            <div className={`motion-result ${selected ? "is-selected" : ""}`}>
              <span>
                Long-grain rice <small>Catalog example</small>
              </span>
              <button
                className={`button ${selected ? "selected-button" : "secondary"}`}
                aria-pressed={selected}
                onClick={() => setSelected(!selected)}
              >
                {selected ? <Check size={18} /> : <Bookmark size={18} />}
                {selected ? "In your study" : "Add to study"}
              </button>
            </div>
          </div>
        </section>

        <section
          className="brand-chapter"
          aria-labelledby="brand-controls-title"
        >
          <div>
            <h2 id="brand-controls-title">
              The same care.
              <br />
              In every interaction.
            </h2>
            <p className="brand-small">
              Select, expand, and review. These are the same controls you use
              to explore suppliers and compare offers.
            </p>
          </div>
          <div className="brand-component-samples">
            <label className="field">
              <span>Example pack unit</span>
              <Select
                aria-label="Example pack unit"
                value={sampleUnit}
                onValueChange={setSampleUnit}
                options={[
                  { value: "", label: "Pending confirmation" },
                  { value: "lb", label: "Pounds (lb)" },
                  { value: "oz", label: "Ounces (oz, weight)" },
                  { value: "kg", label: "Kilograms (kg)" },
                  { value: "L", label: "Liters (L)" },
                  { value: "unit", label: "Units" },
                ]}
              />
            </label>
            <Disclosure
              title="Offer terms"
              description="A section that opens when you need it."
            >
              <p className="brand-small">
                Weight, delivery, and taxes remain pending until confirmed.
                Closing a section preserves your corrections.
              </p>
            </Disclosure>
            <button
              className="button secondary"
              onClick={() => setSampleDialog(true)}
            >
              Open example dialog
            </button>
            <p className="brand-small">
              An interface example. It does not save data or prepare a purchase.
            </p>
          </div>
        </section>

        <section className="brand-voice" aria-labelledby="brand-voice-title">
          <h2 id="brand-voice-title">We speak like someone who knows the kitchen.</h2>
          <div className="brand-voice-lines">
            <p>“Delivery still needs confirmation.”</p>
            <p>“Check the pack size before comparing.”</p>
            <p>“You selected an offer. You have not recorded a purchase.”</p>
          </div>
          <p>
            Clear, approachable, and honest. Every sentence helps with the
            next step. We do not promise savings that have not been measured.
          </p>
        </section>

        <section
          className="brand-chapter"
          aria-labelledby="brand-formats-title"
        >
          <div>
            <h2 id="brand-formats-title">
              The same judgment.
              <br />
              In every format.
            </h2>
            <p className="brand-small">
              Desktop reference: 1920 × 1080, 16:9. Content spans 1536 px with
              192 px margins. The application reflows on laptops and phones.
              Original downloadable artwork retains its Spanish brand copy.
            </p>
          </div>
          <div className="brand-downloads">
            <a href="/brand/surtario-cover-1920x1080.svg" download>
              <span>
                Presentation cover<strong>1920 × 1080 / 16:9</strong>
              </span>
              <Download size={20} />
            </a>
            <a href="/brand/surtario-social-1080x1350.svg" download>
              <span>
                Portrait artwork<strong>1080 × 1350 / 4:5</strong>
              </span>
              <Download size={20} />
            </a>
            <a href="/brand/surtario-story-1080x1920.svg" download>
              <span>
                Story artwork<strong>1080 × 1920 / 9:16</strong>
              </span>
              <Download size={20} />
            </a>
            <a href="/brand/market-still-life.webp" download>
              <span>
                Generated editorial photograph<strong>1122 × 1402 / WebP</strong>
              </span>
              <Download size={20} />
            </a>
          </div>
        </section>
        <footer>
          <Brand compact />
          <p>
            The Surtario identity, applied to the product. The original kit
            includes assets, licenses, and the image prompt.
          </p>
        </footer>
      </main>
      {sampleDialog && (
        <Dialog
          title="The terms, clearly."
          onClose={() => setSampleDialog(false)}
        >
          <p>
            Choose a unit or leave it pending. Escape closes the menu first,
            then this dialog.
          </p>
          <label className="field brand-dialog-field">
            <span>Example unit</span>
            <Select
              aria-label="Example unit"
              value={sampleUnit}
              onValueChange={setSampleUnit}
              options={[
                { value: "", label: "Pending confirmation" },
                { value: "lb", label: "Pounds (lb)" },
                  { value: "oz", label: "Ounces (oz, weight)" },
                  { value: "kg", label: "Kilograms (kg)" },
                { value: "L", label: "Liters (L)" },
                { value: "unit", label: "Units" },
              ]}
            />
          </label>
        </Dialog>
      )}
    </>
  );
}
