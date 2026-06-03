"use client";

import { useRef, useState, useCallback, DragEvent, ChangeEvent } from "react";
import { PDFDocument } from "pdf-lib";
import imageCompression from "browser-image-compression";
import { PageHeader, Card } from "@/components/ui";
import { Icon } from "@/components/Icon";

// ─── helpers ────────────────────────────────────────────────────────────────

function fmtBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
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

type Tab = "compress" | "img2pdf" | "pdfoptimize";

// ─── Dropzone ────────────────────────────────────────────────────────────────

function Dropzone({
  onFiles,
  accept,
  multiple = false,
  label,
  sublabel,
  icon = "Upload",
}: {
  onFiles: (files: File[]) => void;
  accept: string;
  multiple?: boolean;
  label: string;
  sublabel?: string;
  icon?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      const dt = e.dataTransfer.files;
      if (!dt) return;
      const arr = Array.from(dt);
      onFiles(arr);
    },
    [onFiles]
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    onFiles(Array.from(files));
    // reset so same file can be re-picked
    e.target.value = "";
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-[16px] p-8 flex flex-col items-center gap-3 cursor-pointer transition-colors select-none ${
        dragging
          ? "border-gold-bright bg-gold-soft/10"
          : "border-line hover:border-gold bg-bg-2"
      }`}
    >
      <div className="grid place-items-center w-12 h-12 rounded-xl bg-gold-soft text-gold-bright">
        <Icon name={icon} size={22} />
      </div>
      <div className="text-center">
        <p className="font-semibold text-sm">{label}</p>
        {sublabel && <p className="text-txt-faint text-xs mt-0.5">{sublabel}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={handleChange}
      />
    </div>
  );
}

// ─── Privacy note ────────────────────────────────────────────────────────────

function PrivacyNote() {
  return (
    <div className="flex items-center gap-2 text-xs text-green mb-5 px-1">
      <Icon name="Lock" size={13} />
      <span>100% private — files never leave your browser. No uploads, no server.</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: Image Compressor
// ═══════════════════════════════════════════════════════════════════════════

interface CompressItem {
  id: string;
  file: File;
  originalSize: number;
  compressedBlob: Blob | null;
  compressedSize: number | null;
  status: "idle" | "processing" | "done" | "error";
  errorMsg?: string;
}

function ImageCompressorTab() {
  const [items, setItems] = useState<CompressItem[]>([]);
  const [quality, setQuality] = useState(0.7);
  const [maxSizeMB, setMaxSizeMB] = useState(1);
  const [running, setRunning] = useState(false);

  const addFiles = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    const newItems: CompressItem[] = imageFiles.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      originalSize: f.size,
      compressedBlob: null,
      compressedSize: null,
      status: "idle",
    }));
    setItems((prev) => [...prev, ...newItems]);
  };

  const compressAll = async () => {
    if (running) return;
    setRunning(true);

    // mark all idle as processing
    setItems((prev) =>
      prev.map((it) => (it.status === "idle" || it.status === "done" ? { ...it, status: "processing" as const, compressedBlob: null, compressedSize: null } : it))
    );

    const snapshot = items.map((i) => ({ ...i }));

    const updated: CompressItem[] = await Promise.all(
      snapshot.map(async (it) => {
        try {
          const compressed = await imageCompression(it.file, {
            maxSizeMB,
            initialQuality: quality,
            useWebWorker: true,
            fileType: it.file.type as any,
          });
          return {
            ...it,
            compressedBlob: compressed,
            compressedSize: compressed.size,
            status: "done" as const,
          };
        } catch (e: any) {
          return { ...it, status: "error" as const, errorMsg: e?.message ?? "Compression failed" };
        }
      })
    );

    setItems(updated);
    setRunning(false);
  };

  const downloadItem = (item: CompressItem) => {
    if (!item.compressedBlob) return;
    const ext = item.file.name.split(".").pop() ?? "jpg";
    const base = item.file.name.replace(/\.[^.]+$/, "");
    saveBlobAs(item.compressedBlob, `${base}_compressed.${ext}`);
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const clearAll = () => setItems([]);

  const savingPct = (item: CompressItem) => {
    if (!item.compressedSize) return null;
    return Math.round((1 - item.compressedSize / item.originalSize) * 100);
  };

  return (
    <div className="space-y-5">
      <Dropzone
        onFiles={addFiles}
        accept="image/*"
        multiple
        label="Drag & drop images here or click to browse"
        sublabel="JPEG, PNG, WebP, GIF — multiple files supported"
        icon="ImagePlus"
      />

      {/* Options */}
      <Card className="p-4">
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="field-label">Target max size (MB)</label>
            <div className="flex items-center gap-3 mt-1.5">
              <input
                type="range"
                min={0.1}
                max={10}
                step={0.1}
                value={maxSizeMB}
                onChange={(e) => setMaxSizeMB(Number(e.target.value))}
                className="flex-1 accent-[var(--gold)]"
              />
              <span className="text-sm font-semibold w-14 text-right">{maxSizeMB.toFixed(1)} MB</span>
            </div>
          </div>
          <div>
            <label className="field-label">Quality ({Math.round(quality * 100)}%)</label>
            <div className="flex items-center gap-3 mt-1.5">
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={quality}
                onChange={(e) => setQuality(Number(e.target.value))}
                className="flex-1 accent-[var(--gold)]"
              />
              <span className="text-sm font-semibold w-14 text-right">{Math.round(quality * 100)}%</span>
            </div>
          </div>
        </div>
      </Card>

      {items.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="section-label">{items.length} file{items.length !== 1 ? "s" : ""} queued</span>
            <div className="flex gap-2">
              <button onClick={clearAll} className="btn text-xs">Clear all</button>
              <button
                onClick={compressAll}
                disabled={running}
                className="btn btn-primary text-xs"
              >
                {running ? "Compressing…" : "Compress All"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {items.map((item) => {
              const saving = savingPct(item);
              return (
                <Card key={item.id} className="p-3 flex items-center gap-3">
                  <div className="grid place-items-center w-9 h-9 rounded-lg bg-bg-2 text-txt-dim shrink-0">
                    <Icon name="Image" size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>
                    <div className="flex items-center gap-2 text-xs text-txt-dim mt-0.5 flex-wrap">
                      <span>{fmtBytes(item.originalSize)}</span>
                      {item.compressedSize !== null && (
                        <>
                          <Icon name="ArrowRight" size={11} />
                          <span className="text-green">{fmtBytes(item.compressedSize)}</span>
                          {saving !== null && (
                            <span className="tag bg-[rgba(62,199,141,.14)] text-green">
                              -{saving}%
                            </span>
                          )}
                        </>
                      )}
                      {item.status === "processing" && (
                        <span className="text-gold">Processing…</span>
                      )}
                      {item.status === "error" && (
                        <span className="text-red">{item.errorMsg}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === "done" && item.compressedBlob && (
                      <button
                        onClick={() => downloadItem(item)}
                        className="btn text-xs flex items-center gap-1"
                      >
                        <Icon name="Download" size={13} />
                        Download
                      </button>
                    )}
                    <button
                      onClick={() => removeItem(item.id)}
                      className="btn btn-ghost p-1.5 text-txt-faint hover:text-red transition-colors"
                    >
                      <Icon name="X" size={15} />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: Image → PDF
// ═══════════════════════════════════════════════════════════════════════════

interface ImgItem {
  id: string;
  file: File;
  previewUrl: string;
}

function ImageToPdfTab() {
  const [imgs, setImgs] = useState<ImgItem[]>([]);
  const [building, setBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addFiles = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/"));
    if (!imageFiles.length) return;
    setError(null);
    const newItems: ImgItem[] = imageFiles.map((f) => ({
      id: Math.random().toString(36).slice(2),
      file: f,
      previewUrl: URL.createObjectURL(f),
    }));
    setImgs((prev) => [...prev, ...newItems]);
  };

  const removeImg = (id: string) => {
    setImgs((prev) => {
      const removed = prev.find((i) => i.id === id);
      if (removed) URL.revokeObjectURL(removed.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const moveUp = (idx: number) => {
    if (idx === 0) return;
    setImgs((prev) => {
      const arr = [...prev];
      [arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]];
      return arr;
    });
  };

  const moveDown = (idx: number) => {
    setImgs((prev) => {
      if (idx >= prev.length - 1) return prev;
      const arr = [...prev];
      [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]];
      return arr;
    });
  };

  const clearAll = () => {
    imgs.forEach((i) => URL.revokeObjectURL(i.previewUrl));
    setImgs([]);
  };

  const buildPdf = async () => {
    if (building || imgs.length === 0) return;
    setBuilding(true);
    setError(null);
    try {
      const pdfDoc = await PDFDocument.create();
      // A4 in points: 595.28 x 841.89
      const A4_W = 595.28;
      const A4_H = 841.89;

      for (const item of imgs) {
        const arrayBuffer = await item.file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        let embeddedImg;
        if (item.file.type === "image/png") {
          embeddedImg = await pdfDoc.embedPng(bytes);
        } else if (item.file.type === "image/jpeg" || item.file.type === "image/jpg") {
          embeddedImg = await pdfDoc.embedJpg(bytes);
        } else {
          // Convert to JPEG via canvas for WebP / GIF / other formats
          embeddedImg = await embedViaCanvas(pdfDoc, item.file);
        }

        const page = pdfDoc.addPage([A4_W, A4_H]);
        const margin = 20;
        const maxW = A4_W - margin * 2;
        const maxH = A4_H - margin * 2;

        const dims = embeddedImg.scaleToFit(maxW, maxH);
        const x = (A4_W - dims.width) / 2;
        const y = (A4_H - dims.height) / 2;

        page.drawImage(embeddedImg, { x, y, width: dims.width, height: dims.height });
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      saveBlobAs(blob, "images_to_pdf.pdf");
    } catch (e: any) {
      setError(e?.message ?? "Failed to build PDF. Ensure images are valid JPEG or PNG.");
    } finally {
      setBuilding(false);
    }
  };

  return (
    <div className="space-y-5">
      <Dropzone
        onFiles={addFiles}
        accept="image/*"
        multiple
        label="Drop images here or click to pick"
        sublabel="Each image becomes one A4 page — arrange order below"
        icon="Images"
      />

      {error && (
        <div className="card p-3 flex items-center gap-2 text-red text-sm border-red/20">
          <Icon name="AlertCircle" size={15} />
          {error}
        </div>
      )}

      {imgs.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <span className="section-label">{imgs.length} image{imgs.length !== 1 ? "s" : ""} — drag to reorder</span>
            <div className="flex gap-2">
              <button onClick={clearAll} className="btn text-xs">Clear all</button>
              <button
                onClick={buildPdf}
                disabled={building}
                className="btn btn-primary text-xs flex items-center gap-1"
              >
                <Icon name="FileText" size={13} />
                {building ? "Building PDF…" : "Create PDF"}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {imgs.map((img, idx) => (
              <Card key={img.id} className="p-3 flex items-center gap-3">
                <img
                  src={img.previewUrl}
                  alt={img.file.name}
                  className="w-12 h-12 object-cover rounded-lg border border-line shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{img.file.name}</p>
                  <p className="text-xs text-txt-dim">Page {idx + 1} · {fmtBytes(img.file.size)}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => moveUp(idx)}
                    disabled={idx === 0}
                    className="btn btn-ghost p-1.5 text-txt-faint disabled:opacity-30 hover:text-txt transition-colors"
                  >
                    <Icon name="ChevronUp" size={15} />
                  </button>
                  <button
                    onClick={() => moveDown(idx)}
                    disabled={idx === imgs.length - 1}
                    className="btn btn-ghost p-1.5 text-txt-faint disabled:opacity-30 hover:text-txt transition-colors"
                  >
                    <Icon name="ChevronDown" size={15} />
                  </button>
                  <button
                    onClick={() => removeImg(img.id)}
                    className="btn btn-ghost p-1.5 text-txt-faint hover:text-red transition-colors"
                  >
                    <Icon name="X" size={15} />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/** Convert any image format to JPEG via canvas and embed in PDF */
async function embedViaCanvas(pdfDoc: PDFDocument, file: File) {
  return new Promise<Awaited<ReturnType<typeof pdfDoc.embedJpg>>>((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = async () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0);
        canvas.toBlob(async (blob) => {
          if (!blob) { reject(new Error("Canvas conversion failed")); return; }
          const ab = await blob.arrayBuffer();
          const embedded = await pdfDoc.embedJpg(new Uint8Array(ab));
          URL.revokeObjectURL(url);
          resolve(embedded);
        }, "image/jpeg", 0.92);
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(`Failed to load ${file.name}`)); };
    img.src = url;
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: PDF Optimize / Re-save
// ═══════════════════════════════════════════════════════════════════════════

function PdfOptimizeTab() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [originalSize, setOriginalSize] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; size: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (files: File[]) => {
    const pdf = files.find((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
    if (!pdf) { setError("Please select a valid PDF file."); return; }
    setPdfFile(pdf);
    setOriginalSize(pdf.size);
    setResult(null);
    setError(null);
  };

  const optimize = async () => {
    if (!pdfFile || processing) return;
    setProcessing(true);
    setError(null);
    setResult(null);
    try {
      const ab = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(ab, { ignoreEncryption: false });
      const savedBytes = await pdfDoc.save({ useObjectStreams: true });
      const blob = new Blob([savedBytes as unknown as BlobPart], { type: "application/pdf" });
      setResult({ blob, size: blob.size });
    } catch (e: any) {
      setError(
        e?.message?.includes("encrypt")
          ? "This PDF is password-protected. Remove the password first."
          : (e?.message ?? "Failed to process PDF.")
      );
    } finally {
      setProcessing(false);
    }
  };

  const download = () => {
    if (!result || !pdfFile) return;
    const base = pdfFile.name.replace(/\.pdf$/i, "");
    saveBlobAs(result.blob, `${base}_optimized.pdf`);
  };

  const saving = result ? Math.round((1 - result.size / originalSize) * 100) : null;

  return (
    <div className="space-y-5">
      {/* Honesty disclaimer */}
      <div className="card p-4 flex items-start gap-3 border-dashed">
        <div className="text-gold-bright mt-0.5"><Icon name="Info" size={16} /></div>
        <p className="text-sm text-txt-dim leading-relaxed">
          <span className="font-semibold text-txt">What this does:</span> Re-saves the PDF structure using object streams (lossless). This removes redundant cross-references and can reduce file size by 5–30% for large PDFs.
          For heavy image compression you would need a server-side tool like Ghostscript or Smallpdf.
        </p>
      </div>

      <Dropzone
        onFiles={handleFile}
        accept=".pdf,application/pdf"
        label="Drop a PDF here or click to browse"
        sublabel="Lossless re-save — no quality loss"
        icon="FileText"
      />

      {error && (
        <div className="card p-3 flex items-center gap-2 text-red text-sm">
          <Icon name="AlertCircle" size={15} />
          {error}
        </div>
      )}

      {pdfFile && !error && (
        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="grid place-items-center w-10 h-10 rounded-lg bg-bg-2 text-txt-dim">
              <Icon name="FileText" size={20} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{pdfFile.name}</p>
              <p className="text-xs text-txt-dim">{fmtBytes(originalSize)}</p>
            </div>
          </div>

          {result && (
            <div className="flex items-center gap-3 mb-4 p-3 rounded-xl bg-bg-2">
              <div className="text-green"><Icon name="CheckCircle2" size={18} /></div>
              <div className="text-sm">
                <span className="font-semibold">{fmtBytes(originalSize)}</span>
                <Icon name="ArrowRight" size={13} className="inline mx-2 text-txt-faint" />
                <span className="text-green font-semibold">{fmtBytes(result.size)}</span>
                {saving !== null && saving > 0 && (
                  <span className="ml-2 tag bg-[rgba(62,199,141,.14)] text-green">-{saving}%</span>
                )}
                {saving !== null && saving <= 0 && (
                  <span className="ml-2 tag bg-panel-2 text-txt-dim">Already optimal</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={optimize}
              disabled={processing}
              className="btn btn-primary text-sm flex items-center gap-2"
            >
              <Icon name="Zap" size={15} />
              {processing ? "Optimizing…" : "Optimize & Re-save"}
            </button>
            {result && (
              <button onClick={download} className="btn text-sm flex items-center gap-2">
                <Icon name="Download" size={15} />
                Download
              </button>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// Root component
// ═══════════════════════════════════════════════════════════════════════════

const TABS: { key: Tab; label: string; icon: string; desc: string }[] = [
  { key: "compress", label: "Image Compressor", icon: "Minimize2", desc: "Reduce image file size" },
  { key: "img2pdf", label: "Images → PDF", icon: "FilePlus", desc: "Combine images into a PDF" },
  { key: "pdfoptimize", label: "PDF Optimize", icon: "FileStack", desc: "Lossless PDF re-save" },
];

export function FileConverterClient() {
  const [tab, setTab] = useState<Tab>("compress");

  return (
    <div>
      <PageHeader
        title="File Converter"
        subtitle="Compress images, convert images to PDF, and optimize PDF files — 100% in your browser."
        icon="FileCog"
      />

      <PrivacyNote />

      {/* Tab nav */}
      <div className="flex flex-wrap gap-2 mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors border ${
              tab === t.key
                ? "border-gold bg-gold-soft text-gold-bright"
                : "border-line bg-bg-2 text-txt-dim hover:text-txt hover:border-gold/50"
            }`}
          >
            <Icon name={t.icon} size={15} />
            {t.label}
          </button>
        ))}
      </div>

      <Card className="p-5">
        {tab === "compress" && <ImageCompressorTab />}
        {tab === "img2pdf" && <ImageToPdfTab />}
        {tab === "pdfoptimize" && <PdfOptimizeTab />}
      </Card>
    </div>
  );
}
