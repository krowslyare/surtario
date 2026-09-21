import { useEffect, useRef, useState } from "react";
import type {
  PDFDocumentProxy,
  PDFDocumentLoadingTask,
  RenderTask,
} from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Local rendering only. PDF bytes are sent to AI only by the explicit reader action. */
export default function IngredientPdfPreview({ file }: { file: File }) {
  const [document, setDocument] = useState<PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  useEffect(() => {
    let disposed = false;
    let loading: PDFDocumentLoadingTask | undefined;
    setDocument(null);
    setPage(1);
    setError("");
    void (async () => {
      try {
        const pdf = await import("pdfjs-dist");
        if (disposed) return;
        pdf.GlobalWorkerOptions.workerSrc = workerUrl;
        loading = pdf.getDocument({ data: await file.arrayBuffer() });
        if (disposed) {
          await loading.destroy();
          return;
        }
        const result = await loading.promise;
        if (!disposed) setDocument(result);
      } catch {
        if (!disposed)
          setError(
            "This PDF cannot be previewed. Download the original to inspect it, or use an unencrypted PDF.",
          );
      }
    })();
    return () => {
      disposed = true;
      void loading?.destroy().catch(() => {});
    };
  }, [file]);
  return (
    <div className="ingredient-pdf-preview">
      {error ? (
        <p role="alert" className="notice warning">
          {error}
        </p>
      ) : document ? (
        <>
          <PdfPage key={page} document={document} page={page} />
          <div className="pdf-page-controls">
            <button
              className="icon-button"
              aria-label="Previous PDF page"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              <ChevronLeft size={18} />
            </button>
            <span>
              Page {page} of {document.numPages}
            </span>
            <button
              className="icon-button"
              aria-label="Next PDF page"
              disabled={page >= document.numPages}
              onClick={() => setPage(page + 1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </>
      ) : (
        <p role="status">Preparing the original PDF…</p>
      )}
    </div>
  );
}
function PdfPage({
  document,
  page,
}: {
  document: PDFDocumentProxy;
  page: number;
}) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false),
    [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false,
      render: RenderTask | undefined;
    void (async () => {
      try {
        const original = await document.getPage(page);
        if (disposed || !canvas.current) return;
        const base = original.getViewport({ scale: 1 });
        const scale = Math.min(
          1200 / base.width,
          Math.sqrt(2_000_000 / (base.width * base.height)),
        );
        const viewport = original.getViewport({ scale });
        canvas.current.width = Math.ceil(viewport.width);
        canvas.current.height = Math.ceil(viewport.height);
        render = original.render({ canvas: canvas.current, viewport });
        await render.promise;
        if (!disposed) setReady(true);
      } catch {
        if (!disposed) setError(true);
      }
    })();
    return () => {
      disposed = true;
      render?.cancel();
    };
  }, [document, page]);
  return (
    <>
      {error ? (
        <p role="alert">
          This page could not be previewed. Download the original to inspect it.
        </p>
      ) : (
        !ready && <p role="status">Rendering page {page}…</p>
      )}
      <canvas
        ref={canvas}
        role="img"
        aria-label={`Original ingredient list, PDF page ${page}`}
        hidden={!ready}
      />
    </>
  );
}
