"use client";

import {
  useRef,
  useState,
  useCallback,
  useEffect,
  ChangeEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { PDFDocument } from "pdf-lib";
import { PageHeader, Card } from "@/components/ui";
import { Icon } from "@/components/Icon";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function saveBlobAs(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/** Renders one PDF page to a PNG data URL using pdf.js (worker served locally from /public). */
async function renderPdfPage(
  data: ArrayBuffer,
  pageNum: number
): Promise<{ dataUrl: string; ratio: number }> {
  const pdfjs: any = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const doc = await pdfjs.getDocument({ data: data.slice(0) }).promise;
  const page = await doc.getPage(Math.min(pageNum, doc.numPages));
  const viewport = page.getViewport({ scale: 1.4 });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport }).promise;
  const dataUrl = canvas.toDataURL("image/png");
  doc.destroy();
  return { dataUrl, ratio: viewport.width / viewport.height };
}

// ─── Privacy note ────────────────────────────────────────────────────────────

function PrivacyNote() {
  return (
    <div className="flex items-center gap-2 text-xs text-green mb-5 px-1">
      <Icon name="Lock" size={13} />
      <span>Private — signing happens locally in your browser. No files are uploaded.</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Signature Canvas
// ═══════════════════════════════════════════════════════════════════════════

interface SignatureCanvasProps {
  onSignatureChange: (dataUrl: string | null) => void;
}

function SignatureCanvas({ onSignatureChange }: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const historyRef = useRef<ImageData[]>([]);
  const [isEmpty, setIsEmpty] = useState(true);

  const getCtx = () => canvasRef.current?.getContext("2d") ?? null;

  const getPos = (e: PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const saveSnapshot = () => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    historyRef.current.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
    if (historyRef.current.length > 30) historyRef.current.shift();
  };

  const onPointerDown = (e: PointerEvent) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    saveSnapshot();
    drawingRef.current = true;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!drawingRef.current) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#d9a441";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  };

  const onPointerUp = () => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    setIsEmpty(false);
    exportSignature();
  };

  const exportSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSignatureChange(canvas.toDataURL("image/png"));
  };

  const clear = () => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;
    historyRef.current = [];
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onSignatureChange(null);
  };

  const undo = () => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas || historyRef.current.length === 0) return;
    const prev = historyRef.current.pop()!;
    ctx.putImageData(prev, 0, 0);
    if (historyRef.current.length === 0) {
      // check if truly empty
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const hasPixels = data.some((v, i) => i % 4 === 3 && v > 0);
      setIsEmpty(!hasPixels);
      onSignatureChange(hasPixels ? canvas.toDataURL("image/png") : null);
    } else {
      exportSignature();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.addEventListener("pointerdown", onPointerDown, { passive: false });
    canvas.addEventListener("pointermove", onPointerMove, { passive: false });
    canvas.addEventListener("pointerup", onPointerUp);
    canvas.addEventListener("pointercancel", onPointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="field-label">Draw your signature</label>
        <div className="flex gap-1.5">
          <button onClick={undo} className="btn text-xs flex items-center gap-1">
            <Icon name="Undo2" size={12} />
            Undo
          </button>
          <button onClick={clear} className="btn text-xs flex items-center gap-1">
            <Icon name="Trash2" size={12} />
            Clear
          </button>
        </div>
      </div>
      <div className="relative rounded-[16px] overflow-hidden border border-line bg-[#0f0c07]">
        <canvas
          ref={canvasRef}
          width={600}
          height={180}
          className="w-full h-[140px] touch-none cursor-crosshair block"
        />
        {isEmpty && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="text-txt-faint text-sm">Sign here with mouse or touch</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Placement Box (draggable overlay on page placeholder)
// ═══════════════════════════════════════════════════════════════════════════

interface PlacementBox {
  // in preview-area percent (0–100)
  xPct: number;
  yPct: number;
  wPct: number;
  hPct: number;
}

interface PlacementAreaProps {
  box: PlacementBox;
  onChange: (b: PlacementBox) => void;
  sigDataUrl: string | null;
  pageImg: string | null;
  pageRatio: number; // width / height
  rendering: boolean;
}

function PlacementArea({ box, onChange, sigDataUrl, pageImg, pageRatio, rendering }: PlacementAreaProps) {
  const areaRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; startBox: PlacementBox } | null>(null);
  const resizeRef = useRef<{ startX: number; startY: number; startBox: PlacementBox } | null>(null);

  const pctToStyle = (b: PlacementBox) => ({
    left: `${b.xPct}%`,
    top: `${b.yPct}%`,
    width: `${b.wPct}%`,
    height: `${b.hPct}%`,
  });

  const getAreaSize = () => {
    if (!areaRef.current) return { w: 1, h: 1 };
    const r = areaRef.current.getBoundingClientRect();
    return { w: r.width, h: r.height };
  };

  // ── Drag to move ──
  const onBoxPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startBox: { ...box } };

    const onMove = (ev: PointerEvent) => {
      if (!dragRef.current) return;
      const { w, h } = getAreaSize();
      const dx = ((ev.clientX - dragRef.current.startX) / w) * 100;
      const dy = ((ev.clientY - dragRef.current.startY) / h) * 100;
      const newX = Math.max(0, Math.min(100 - dragRef.current.startBox.wPct, dragRef.current.startBox.xPct + dx));
      const newY = Math.max(0, Math.min(100 - dragRef.current.startBox.hPct, dragRef.current.startBox.yPct + dy));
      onChange({ ...dragRef.current.startBox, xPct: newX, yPct: newY });
    };
    const onUp = () => {
      dragRef.current = null;
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
  };

  // ── Resize handle (bottom-right corner) ──
  const onResizePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    const el = e.currentTarget;
    el.setPointerCapture(e.pointerId);
    resizeRef.current = { startX: e.clientX, startY: e.clientY, startBox: { ...box } };

    const onMove = (ev: PointerEvent) => {
      if (!resizeRef.current) return;
      const { w, h } = getAreaSize();
      const dx = ((ev.clientX - resizeRef.current.startX) / w) * 100;
      const dy = ((ev.clientY - resizeRef.current.startY) / h) * 100;
      const newW = Math.max(5, Math.min(100 - resizeRef.current.startBox.xPct, resizeRef.current.startBox.wPct + dx));
      const newH = Math.max(3, Math.min(100 - resizeRef.current.startBox.yPct, resizeRef.current.startBox.hPct + dy));
      onChange({ ...resizeRef.current.startBox, wPct: newW, hPct: newH });
    };
    const onUp = () => {
      resizeRef.current = null;
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
    };
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
  };

  return (
    <div
      ref={areaRef}
      className="relative border border-line rounded-xl overflow-hidden select-none bg-white mx-auto"
      style={{ aspectRatio: String(pageRatio || 0.707), maxWidth: "100%", boxShadow: "var(--shadow)" }}
    >
      {/* Rendered PDF page */}
      {pageImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pageImg} alt={`Page preview`} className="absolute inset-0 w-full h-full object-contain pointer-events-none" draggable={false} />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-bg-2">
          <span className="text-txt-faint text-xs font-medium flex items-center gap-2">
            {rendering ? <><Icon name="Loader" size={14} className="animate-spin" /> Rendering page…</> : "Upload a PDF to preview"}
          </span>
        </div>
      )}

      {/* Signature box */}
      <div
        onPointerDown={onBoxPointerDown}
        className="absolute border-2 border-gold rounded-lg cursor-move flex items-center justify-center overflow-hidden touch-none"
        style={pctToStyle(box)}
      >
        {sigDataUrl ? (
          <img src={sigDataUrl} alt="signature" className="w-full h-full object-contain" />
        ) : (
          <span className="text-gold text-[10px] font-semibold opacity-60 pointer-events-none">SIG</span>
        )}

        {/* Resize handle */}
        <div
          onPointerDown={onResizePointerDown}
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gold rounded-tl-md touch-none"
          style={{ touchAction: "none" }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Main PDF Sign Client
// ═══════════════════════════════════════════════════════════════════════════

type SigMode = "draw" | "upload";

export function PdfSignClient() {
  // ── PDF state ──
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [selectedPage, setSelectedPage] = useState(1);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // ── Rendered page preview ──
  const pdfBytesRef = useRef<ArrayBuffer | null>(null);
  const [pageImg, setPageImg] = useState<string | null>(null);
  const [pageRatio, setPageRatio] = useState(0.707);
  const [rendering, setRendering] = useState(false);

  // ── Signature state ──
  const [sigMode, setSigMode] = useState<SigMode>("draw");
  const [sigDataUrl, setSigDataUrl] = useState<string | null>(null);
  const [uploadedSigUrl, setUploadedSigUrl] = useState<string | null>(null);

  // ── Placement ──
  const [box, setBox] = useState<PlacementBox>({ xPct: 30, yPct: 70, wPct: 38, hPct: 10 });
  // Numeric fine-tune
  const [numX, setNumX] = useState(30);
  const [numY, setNumY] = useState(70);
  const [numW, setNumW] = useState(38);
  const [numH, setNumH] = useState(10);

  // ── Signing state ──
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Sync box <-> numeric inputs
  const updateBox = useCallback((b: PlacementBox) => {
    setBox(b);
    setNumX(Math.round(b.xPct));
    setNumY(Math.round(b.yPct));
    setNumW(Math.round(b.wPct));
    setNumH(Math.round(b.hPct));
  }, []);

  const applyNumerics = () => {
    updateBox({ xPct: numX, yPct: numY, wPct: numW, hPct: numH });
  };

  // ── Render the selected page whenever the PDF or page changes ──
  useEffect(() => {
    let cancelled = false;
    if (!pdfFile || !pdfBytesRef.current || pageCount === 0) {
      setPageImg(null);
      return;
    }
    setRendering(true);
    renderPdfPage(pdfBytesRef.current, selectedPage)
      .then(({ dataUrl, ratio }) => {
        if (cancelled) return;
        setPageImg(dataUrl);
        setPageRatio(ratio);
      })
      .catch(() => {
        if (!cancelled) setPageImg(null);
      })
      .finally(() => {
        if (!cancelled) setRendering(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pdfFile, selectedPage, pageCount]);

  // ── Active signature ──
  const activeSig = sigMode === "draw" ? sigDataUrl : uploadedSigUrl;

  // ── Load PDF ──
  const handlePdfFile = async (files: File[]) => {
    const file = files.find((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!file) { setPdfError("Please choose a valid PDF file."); return; }
    setPdfLoading(true);
    setPdfError(null);
    setDone(false);
    setSignError(null);
    try {
      const ab = await file.arrayBuffer();
      pdfBytesRef.current = ab.slice(0);
      const pdfDoc = await PDFDocument.load(ab, { ignoreEncryption: false });
      const pages = pdfDoc.getPageCount();
      setPdfFile(file);
      setPageCount(pages);
      setSelectedPage(1);
    } catch (e: any) {
      setPdfError(
        e?.message?.includes("encrypt")
          ? "This PDF is password-protected. Please remove the password first."
          : "Could not read PDF. Make sure the file is a valid, unencrypted PDF."
      );
      setPdfFile(null);
    } finally {
      setPdfLoading(false);
    }
  };

  // ── Upload signature image ──
  const handleSigUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (uploadedSigUrl) URL.revokeObjectURL(uploadedSigUrl);
    setUploadedSigUrl(URL.createObjectURL(file));
    e.target.value = "";
  };

  // ── Sign & Download ──
  const sign = async () => {
    if (!pdfFile || !activeSig || signing) return;
    setSigning(true);
    setSignError(null);
    setDone(false);
    try {
      // Load PDF
      const ab = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(ab);
      const pages = pdfDoc.getPages();
      const page = pages[selectedPage - 1];
      const { width: pageW, height: pageH } = page.getSize();

      // Convert data URL -> bytes
      const sigResponse = await fetch(activeSig);
      const sigBlob = await sigResponse.blob();

      let embeddedImg;
      if (sigBlob.type === "image/jpeg") {
        const sigBytes = new Uint8Array(await sigBlob.arrayBuffer());
        embeddedImg = await pdfDoc.embedJpg(sigBytes);
      } else {
        // PNG (draw canvas always produces PNG; uploaded could be PNG)
        const sigBytes = new Uint8Array(await sigBlob.arrayBuffer());
        embeddedImg = await pdfDoc.embedPng(sigBytes);
      }

      // Map placement box % → PDF coordinates
      // PDF origin is bottom-left; our box Y is from top
      const sigX = (box.xPct / 100) * pageW;
      const sigW = (box.wPct / 100) * pageW;
      const sigH = (box.hPct / 100) * pageH;
      // yPct is from top: convert to PDF y (from bottom)
      const sigY = pageH - (box.yPct / 100) * pageH - sigH;

      page.drawImage(embeddedImg, {
        x: sigX,
        y: sigY,
        width: sigW,
        height: sigH,
      });

      const savedBytes = await pdfDoc.save();
      const blob = new Blob([savedBytes as unknown as BlobPart], { type: "application/pdf" });
      const base = pdfFile.name.replace(/\.pdf$/i, "");
      saveBlobAs(blob, `${base}_signed.pdf`);
      setDone(true);
    } catch (e: any) {
      setSignError(e?.message ?? "Failed to sign PDF. Please try again.");
    } finally {
      setSigning(false);
    }
  };

  const canSign = !!pdfFile && !!activeSig;

  return (
    <div>
      <PageHeader
        title="PDF Signature Tool"
        subtitle="Upload a PDF, draw or upload your signature, position it, then download the signed document."
        icon="PenLine"
      />

      <PrivacyNote />

      <div className="grid lg:grid-cols-2 gap-5">
        {/* ── Left column: PDF + sig ── */}
        <div className="space-y-5">
          {/* Step 1: Upload PDF */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-gold-soft text-gold-bright text-xs font-bold">1</span>
              <h3 className="font-display font-bold text-base">Upload PDF</h3>
            </div>

            <div
              onClick={() => document.getElementById("pdf-input")?.click()}
              className={`border-2 border-dashed rounded-[16px] p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors ${
                pdfError ? "border-red/40 bg-red/5" : "border-line hover:border-gold bg-bg-2"
              }`}
            >
              <div className={`grid place-items-center w-11 h-11 rounded-xl ${pdfError ? "bg-red/10 text-red" : "bg-gold-soft text-gold-bright"}`}>
                <Icon name={pdfLoading ? "Loader" : "FileText"} size={20} />
              </div>
              {pdfFile && !pdfError ? (
                <div className="text-center">
                  <p className="font-semibold text-sm text-green">{pdfFile.name}</p>
                  <p className="text-txt-dim text-xs mt-0.5">{pageCount} page{pageCount !== 1 ? "s" : ""} · {fmtBytes(pdfFile.size)}</p>
                </div>
              ) : (
                <div className="text-center">
                  <p className="font-semibold text-sm">{pdfLoading ? "Reading PDF…" : "Drop a PDF or click to browse"}</p>
                  <p className="text-txt-faint text-xs mt-0.5">Supports unencrypted PDFs</p>
                </div>
              )}
              <input
                id="pdf-input"
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => handlePdfFile(Array.from(e.target.files ?? []))}
              />
            </div>

            {pdfError && (
              <div className="mt-3 flex items-center gap-2 text-red text-sm">
                <Icon name="AlertCircle" size={14} />
                {pdfError}
              </div>
            )}
          </Card>

          {/* Step 2: Signature */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-gold-soft text-gold-bright text-xs font-bold">2</span>
              <h3 className="font-display font-bold text-base">Create Signature</h3>
            </div>

            {/* Mode toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setSigMode("draw")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  sigMode === "draw"
                    ? "border-gold bg-gold-soft text-gold-bright"
                    : "border-line text-txt-dim hover:text-txt"
                }`}
              >
                <Icon name="PenLine" size={14} />
                Draw
              </button>
              <button
                onClick={() => setSigMode("upload")}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors border ${
                  sigMode === "upload"
                    ? "border-gold bg-gold-soft text-gold-bright"
                    : "border-line text-txt-dim hover:text-txt"
                }`}
              >
                <Icon name="Upload" size={14} />
                Upload Image
              </button>
            </div>

            {sigMode === "draw" ? (
              <SignatureCanvas onSignatureChange={setSigDataUrl} />
            ) : (
              <div className="space-y-3">
                <label
                  className={`flex flex-col items-center gap-3 p-5 rounded-[16px] border-2 border-dashed cursor-pointer transition-colors ${
                    uploadedSigUrl ? "border-green bg-[rgba(62,199,141,.05)]" : "border-line hover:border-gold bg-bg-2"
                  }`}
                >
                  <div className={`grid place-items-center w-10 h-10 rounded-xl ${uploadedSigUrl ? "bg-[rgba(62,199,141,.12)] text-green" : "bg-gold-soft text-gold-bright"}`}>
                    <Icon name={uploadedSigUrl ? "CheckCircle2" : "ImagePlus"} size={18} />
                  </div>
                  <span className="text-sm font-medium">
                    {uploadedSigUrl ? "Signature image loaded (click to change)" : "Click to upload PNG/JPEG signature"}
                  </span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/jpg"
                    className="hidden"
                    onChange={handleSigUpload}
                  />
                </label>
                {uploadedSigUrl && (
                  <div className="rounded-xl border border-line overflow-hidden bg-[#0f0c07] p-3 flex items-center justify-center" style={{ minHeight: 80 }}>
                    <img src={uploadedSigUrl} alt="uploaded signature" className="max-h-20 object-contain" />
                  </div>
                )}
              </div>
            )}

            {activeSig && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-green">
                <Icon name="CheckCircle2" size={13} />
                Signature ready
              </div>
            )}
          </Card>
        </div>

        {/* ── Right column: placement + page ── */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-gold-soft text-gold-bright text-xs font-bold">3</span>
              <h3 className="font-display font-bold text-base">Position Signature</h3>
            </div>

            {/* Page selector */}
            {pageCount > 0 && (
              <div className="mb-4">
                <label className="field-label mb-1.5 block">Page to sign ({pageCount} total)</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedPage((p) => Math.max(1, p - 1))}
                    disabled={selectedPage <= 1}
                    className="btn p-2 disabled:opacity-30"
                  >
                    <Icon name="ChevronLeft" size={15} />
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={pageCount}
                    value={selectedPage}
                    onChange={(e) => {
                      const v = Math.max(1, Math.min(pageCount, Number(e.target.value)));
                      setSelectedPage(v);
                    }}
                    className="input w-16 text-center text-sm"
                  />
                  <button
                    onClick={() => setSelectedPage((p) => Math.min(pageCount, p + 1))}
                    disabled={selectedPage >= pageCount}
                    className="btn p-2 disabled:opacity-30"
                  >
                    <Icon name="ChevronRight" size={15} />
                  </button>
                  <span className="text-txt-dim text-sm">of {pageCount}</span>
                </div>
              </div>
            )}

            {/* Placement area */}
            <div className="mb-4">
              <p className="text-xs text-txt-dim mb-2">
                Drag the gold box to position, resize with the bottom-right handle.
              </p>
              <PlacementArea box={box} onChange={updateBox} sigDataUrl={activeSig} pageImg={pageImg} pageRatio={pageRatio} rendering={rendering} />
            </div>

            {/* Numeric fine-tune */}
            <details className="group">
              <summary className="cursor-pointer text-xs text-txt-dim flex items-center gap-1.5 list-none select-none mb-2">
                <Icon name="SlidersHorizontal" size={13} />
                Fine-tune numerically (% of page)
                <Icon name="ChevronDown" size={13} className="group-open:rotate-180 transition-transform" />
              </summary>
              <div className="grid grid-cols-2 gap-3 pt-1">
                {(
                  [
                    { label: "X pos (%)", val: numX, set: setNumX, min: 0, max: 95 },
                    { label: "Y pos (%)", val: numY, set: setNumY, min: 0, max: 95 },
                    { label: "Width (%)", val: numW, set: setNumW, min: 5, max: 100 },
                    { label: "Height (%)", val: numH, set: setNumH, min: 3, max: 100 },
                  ] as const
                ).map(({ label, val, set, min, max }) => (
                  <div key={label}>
                    <label className="field-label text-[11px]">{label}</label>
                    <input
                      type="number"
                      min={min}
                      max={max}
                      value={val}
                      onChange={(e) => (set as (v: number) => void)(Number(e.target.value))}
                      onBlur={applyNumerics}
                      className="input w-full text-sm mt-1"
                    />
                  </div>
                ))}
              </div>
              <button onClick={applyNumerics} className="btn text-xs mt-2">Apply</button>
            </details>
          </Card>

          {/* Step 4: Sign */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <span className="grid place-items-center w-6 h-6 rounded-full bg-gold-soft text-gold-bright text-xs font-bold">4</span>
              <h3 className="font-display font-bold text-base">Sign &amp; Download</h3>
            </div>

            {!pdfFile && (
              <p className="text-txt-dim text-sm mb-4">Upload a PDF in step 1 first.</p>
            )}
            {pdfFile && !activeSig && (
              <p className="text-txt-dim text-sm mb-4">Create or upload a signature in step 2 first.</p>
            )}

            {signError && (
              <div className="flex items-center gap-2 text-red text-sm mb-4 card p-3">
                <Icon name="AlertCircle" size={14} />
                {signError}
              </div>
            )}

            {done && (
              <div className="flex items-center gap-2 text-green text-sm mb-4 card p-3">
                <Icon name="CheckCircle2" size={14} />
                Signed PDF downloaded! You can adjust the position and sign again if needed.
              </div>
            )}

            <button
              onClick={sign}
              disabled={!canSign || signing}
              className="btn btn-primary flex items-center gap-2 disabled:opacity-40"
            >
              <Icon name={signing ? "Loader" : "PenLine"} size={16} />
              {signing ? "Signing…" : "Sign & Download PDF"}
            </button>

            {pdfFile && (
              <p className="text-xs text-txt-faint mt-3">
                Signing page {selectedPage} of {pageCount} — {pdfFile.name}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
