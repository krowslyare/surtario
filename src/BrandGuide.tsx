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
    name: "Berenjena",
    hex: "#42202D",
    role: "La voz de la marca",
    light: true,
  },
  { name: "Rábano", hex: "#EEC6D0", role: "Su lado más cercano", light: false },
  { name: "Ají", hex: "#BA3527", role: "Un acento con carácter", light: true },
  { name: "Lima", hex: "#E4EF9B", role: "Un detalle fresco", light: false },
  {
    name: "Porcelana",
    hex: "#FAFAF7",
    role: "Espacio para trabajar",
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
      setCopied(`Copiado: ${hex}`);
    } catch {
      setCopied(`Copia este color: ${hex}`);
    }
  }
  return (
    <>
      <a className="skip-link" href="#brand-story">
        Ir a la historia de marca
      </a>
      <header className="topbar">
        <Brand />
        <a className="button secondary" href="/">
          Abrir producto
        </a>
      </header>
      <main className="brand-guide">
        <div className="brand-guide-intro">
          <p>Identidad de producto / Surtario 1.2</p>
          <a
            className="button text-button"
            href="/brand/surtario-brand-kit.zip"
            download
          >
            <Download size={16} /> Descargar kit de marca
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
              La cocina empieza
              <br />
              en el mercado.
            </h1>
            <p>
              Antes del fuego, están los ingredientes. Y antes de los
              ingredientes, las preguntas: de dónde vienen, cuánto cuestan, cómo
              llegan.
            </p>
            <p>
              Surtario acompaña lo que hace posible cada servicio: surtir la
              cocina con criterio. Reúne fuentes, conoce alternativas y prepara
              tu próxima compra con las condiciones claras.
            </p>
            <span className="manifesto-signature">
              Buen criterio. Buenos insumos.
            </span>
          </div>
          <img
            className="manifesto-photo"
            src="/brand/market-still-life.webp"
            alt="Arroz, ajíes, tomates y limones sobre una superficie rosa; fotografía de marca generada."
            width="1122"
            height="1402"
          />
        </section>

        <section className="brand-chapter" aria-labelledby="brand-name-title">
          <div>
            <h2 id="brand-name-title">
              Surtir la cocina.
              <br />
              Muchas buenas preguntas.
            </h2>
          </div>
          <div className="brand-prose">
            <p>
              <strong>Surtario</strong> nace de surtir y del ritmo diario de una
              cocina. Cada insumo tiene una presentación, una procedencia y unas
              condiciones. Conocerlas es el primer paso para elegir bien.
            </p>
            <p>
              El descriptor <strong>Mercado para tu cocina</strong> explica su
              territorio. Hablamos al encargado de compras y al equipo de
              cocina: gente que necesita entender una oferta antes de elegirla.
            </p>
            <p className="brand-small">
              Puedes explorar el mercado sin inventario, documentos propios ni
              compras anteriores. El estudio empieza con una pregunta.
            </p>
          </div>
        </section>

        <section className="brand-colors" aria-labelledby="brand-colors-title">
          <div className="brand-section-title">
            <h2 id="brand-colors-title">Una paleta que abre el apetito.</h2>
            <p>Pulsa un color para copiarlo.</p>
          </div>
          <div className="brand-swatches">
            {palette.map((color) => (
              <button
                key={color.hex}
                className={`brand-swatch${color.light ? " light-ink" : ""}`}
                style={{ "--swatch": color.hex } as CSSProperties}
                onClick={() => void copyColor(color.hex)}
                aria-label={`Copiar ${color.name}, ${color.hex}`}
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
            Porcelana y blanco sostienen la lectura. Berenjena conduce; rosa y
            ají dan personalidad. Lima aparece en detalles. Los colores de marca
            no califican proveedores ni sustituyen estados con texto.
          </p>
        </section>

        <section className="brand-chapter" aria-labelledby="brand-logo-title">
          <div>
            <h2 id="brand-logo-title">
              Un símbolo
              <br />
              para volver a reconocer.
            </h2>
            <p className="brand-small">
              Un cuenco redondo y dos granos. El origen de lo que llega a la
              cocina. Logotipo de contornos vectoriales: conserva su forma sin
              depender de una fuente instalada.
            </p>
            <SegmentedControl
              label="Variante del logotipo"
              value={variant}
              onValueChange={setVariant}
              options={
                [
                  { value: "dark", label: "Color" },
                  { value: "light", label: "Negativo" },
                  { value: "mono", label: "Una tinta" },
                ] as const
              }
            />
            <a
              className="button text-button"
              href={`/brand/surtario-wordmark-${variant}.svg`}
              download
            >
              <Download size={16} /> Descargar logotipo SVG
            </a>
          </div>
          <div className={`brand-logo-proof proof-${variant}`}>
            <img
              className="proof-symbol"
              src={`/brand/surtario-symbol${variant === "light" ? "-light" : variant === "mono" ? "-mono" : ""}.svg`}
              width="100"
              height="100"
              alt="Símbolo Surtario"
            />
            <img
              className="proof-wordmark"
              src={`/brand/surtario-wordmark-${variant}.svg`}
              width="360"
              height="140"
              alt={`Logotipo Surtario, ${variant === "light" ? "negativo" : variant === "mono" ? "una tinta" : "color"}`}
            />
            <span>Mercado para tu cocina</span>
          </div>
        </section>

        <section className="brand-type" aria-labelledby="brand-type-title">
          <div className="brand-section-title">
            <h2 id="brand-type-title">Carácter al hablar. Claridad al leer.</h2>
          </div>
          <div className="brand-type-pair">
            <div className="display-specimen">
              <p>Bricolage Grotesque / Titulares</p>
              <strong>
                Arroz, ají
                <br />y buen ojo.
              </strong>
              <span>Una voz expresiva para las ideas grandes.</span>
            </div>
            <div className="body-specimen">
              <p>Manrope / Interfaz</p>
              <h3>Las condiciones, sobre la mesa.</h3>
              <p>
                Presentación de 18 kg. Precio de ejemplo por unidad, fuente
                conservada y entrega por confirmar.
              </p>
              <strong>
                S/ 4.44 <small>/ kg</small>
              </strong>
              <span>
                Moneda explícita. Cifras tabulares. Pendientes visibles.
              </span>
            </div>
          </div>
        </section>

        <section className="brand-chapter" aria-labelledby="brand-motion-title">
          <div>
            <h2 id="brand-motion-title">
              Movimiento
              <br />
              que responde.
            </h2>
            <p className="brand-small">
              La selección cambia de estado en 180 ms. Los diálogos entran en
              200 ms. Una única entrada de imagen de 500 ms. Sin bucles, sin
              contar dinero desde cero, con movimiento reducido respetado.
            </p>
          </div>
          <div className="brand-motion-example">
            <p className="brand-small">
              Prueba de interacción; no guarda un estudio.
            </p>
            <div className={`motion-result ${selected ? "is-selected" : ""}`}>
              <span>
                Arroz extra <small>Ejemplo de catálogo</small>
              </span>
              <button
                className={`button ${selected ? "selected-button" : "secondary"}`}
                aria-pressed={selected}
                onClick={() => setSelected(!selected)}
              >
                {selected ? <Check size={18} /> : <Bookmark size={18} />}
                {selected ? "En tu estudio" : "Añadir al estudio"}
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
              El mismo cuidado.
              <br />
              En cada interacción.
            </h2>
            <p className="brand-small">
              Selecciona, despliega y revisa. Estos controles son los que usas
              al explorar el mercado y comparar ofertas.
            </p>
          </div>
          <div className="brand-component-samples">
            <label className="field">
              <span>Unidad de presentación de ejemplo</span>
              <Select
                aria-label="Unidad de presentación de ejemplo"
                value={sampleUnit}
                onValueChange={setSampleUnit}
                options={[
                  { value: "", label: "Pendiente de confirmar" },
                  { value: "kg", label: "Kilogramos (kg)" },
                  { value: "L", label: "Litros (L)" },
                  { value: "unit", label: "Unidades" },
                ]}
              />
            </label>
            <Disclosure
              title="Condiciones de la oferta"
              description="Una sección que se abre cuando la necesitas."
            >
              <p className="brand-small">
                El peso, la entrega y los impuestos quedan pendientes hasta
                confirmarlos. Al cerrar una sección, las correcciones
                permanecen.
              </p>
            </Disclosure>
            <button
              className="button secondary"
              onClick={() => setSampleDialog(true)}
            >
              Abrir diálogo de ejemplo
            </button>
            <p className="brand-small">
              Prueba de interfaz. No registra datos ni prepara una compra.
            </p>
          </div>
        </section>

        <section className="brand-voice" aria-labelledby="brand-voice-title">
          <h2 id="brand-voice-title">Hablamos como quien conoce su cocina.</h2>
          <div className="brand-voice-lines">
            <p>“Falta confirmar la entrega.”</p>
            <p>“Revisa la presentación antes de comparar.”</p>
            <p>“Elegiste una oferta. Aún no registraste una compra.”</p>
          </div>
          <p>
            Concreto, cercano y honesto. Cada frase ayuda a tomar el siguiente
            paso. La marca no promete ahorros que todavía no se han medido.
          </p>
        </section>

        <section
          className="brand-chapter"
          aria-labelledby="brand-formats-title"
        >
          <div>
            <h2 id="brand-formats-title">
              El mismo criterio.
              <br />
              En cada formato.
            </h2>
            <p className="brand-small">
              Escritorio de referencia: 1920 × 1080, 16:9. Contenido de 1536 px,
              con márgenes de 192 px. La aplicación se recompone en portátil y
              móvil, sin comprimir una captura.
            </p>
          </div>
          <div className="brand-downloads">
            <a href="/brand/surtario-cover-1920x1080.svg" download>
              <span>
                Portada de presentación<strong>1920 × 1080 / 16:9</strong>
              </span>
              <Download size={20} />
            </a>
            <a href="/brand/surtario-social-1080x1350.svg" download>
              <span>
                Pieza vertical<strong>1080 × 1350 / 4:5</strong>
              </span>
              <Download size={20} />
            </a>
            <a href="/brand/surtario-story-1080x1920.svg" download>
              <span>
                Historia<strong>1080 × 1920 / 9:16</strong>
              </span>
              <Download size={20} />
            </a>
            <a href="/brand/market-still-life.webp" download>
              <span>
                Fotografía editorial generada<strong>1122 × 1402 / WebP</strong>
              </span>
              <Download size={20} />
            </a>
          </div>
        </section>
        <footer>
          <Brand compact />
          <p>
            Identidad Surtario aplicada al producto local. Assets, licencias y
            prompt incluidos en el kit.
          </p>
        </footer>
      </main>
      {sampleDialog && (
        <Dialog
          title="Las condiciones, claras."
          onClose={() => setSampleDialog(false)}
        >
          <p>
            Elige una unidad o deja el dato pendiente. Escape cierra primero el
            menú y después este diálogo.
          </p>
          <label className="field brand-dialog-field">
            <span>Unidad del ejemplo</span>
            <Select
              aria-label="Unidad del ejemplo"
              value={sampleUnit}
              onValueChange={setSampleUnit}
              options={[
                { value: "", label: "Pendiente de confirmar" },
                { value: "kg", label: "Kilogramos (kg)" },
                { value: "L", label: "Litros (L)" },
                { value: "unit", label: "Unidades" },
              ]}
            />
          </label>
        </Dialog>
      )}
    </>
  );
}
