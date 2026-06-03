"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { Icon } from "@/components/Icon";

type UserRow = { id: string; name: string; avatarColor: string; role: string };

const CSV_TEMPLATE_HEADERS = [
  "name",
  "phone",
  "email",
  "propertyType",
  "location",
  "source",
  "temperature",
  "stage",
  "value",
  "notes",
].join(",");

const CSV_TEMPLATE_ROW =
  "Ramesh Kumar,+91 98765 43210,ramesh@example.com,3BHK,Mansarovar,REFERRAL,WARM,NEW,5000000,Interested in Q1 possession";

const CSV_TEMPLATE_BLOB = `${CSV_TEMPLATE_HEADERS}\n${CSV_TEMPLATE_ROW}\n`;

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE_BLOB], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "leads-import-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function CsvImportButton({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported?: number; skipped?: number; errors?: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setResult(null);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        setRows(res.data);
        setHeaders(res.meta.fields ?? []);
      },
    });
  }, []);

  async function handleImport() {
    if (rows.length === 0) return;
    setImporting(true);
    try {
      const res = await fetch("/api/leads/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResult(data);
      if (res.ok) {
        router.refresh();
        // Reset file input
        if (fileRef.current) fileRef.current.value = "";
        setRows([]);
        setHeaders([]);
      }
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setRows([]);
    setHeaders([]);
    setResult(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="btn btn-ghost flex items-center gap-2 text-sm"
      >
        <Icon name="Upload" size={15} />
        Import CSV
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="card w-full max-w-2xl max-h-[85vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-line flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className="grid place-items-center w-8 h-8 rounded-lg bg-gold-soft text-gold-bright">
                    <Icon name="Upload" size={16} />
                  </div>
                  <h3 className="font-display font-bold text-lg">Import Leads from CSV</h3>
                </div>
                <button onClick={handleClose} className="btn btn-ghost p-2">
                  <Icon name="X" size={18} />
                </button>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Template download */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-panel-2 border border-line">
                  <Icon name="FileText" size={16} className="text-gold-bright flex-shrink-0" />
                  <span className="text-sm text-txt-dim flex-1">
                    Use the template CSV for correct column names.
                  </span>
                  <button
                    onClick={downloadTemplate}
                    className="btn btn-ghost text-xs flex items-center gap-1"
                  >
                    <Icon name="Download" size={12} />
                    Template
                  </button>
                </div>

                {/* File input */}
                <div>
                  <label className="field-label">Select CSV File</label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFile}
                    className="input w-full mt-1 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:bg-gold-soft file:text-gold-bright file:text-xs file:font-semibold cursor-pointer"
                  />
                </div>

                {/* Preview table */}
                {rows.length > 0 && (
                  <div>
                    <div className="field-label mb-2">
                      Preview — {rows.length} row{rows.length !== 1 ? "s" : ""} detected
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-line">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-line">
                            {headers.map((h) => (
                              <th
                                key={h}
                                className="px-3 py-2 text-left text-txt-faint font-semibold uppercase tracking-wide whitespace-nowrap"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {rows.slice(0, 10).map((row, i) => (
                            <tr key={i} className="border-b border-line/50 last:border-0 hover:bg-panel-2 transition-colors">
                              {headers.map((h) => (
                                <td key={h} className="px-3 py-2 whitespace-nowrap text-txt-dim truncate max-w-[140px]">
                                  {row[h] ?? ""}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {rows.length > 10 && (
                        <div className="px-3 py-2 text-xs text-txt-faint border-t border-line">
                          …and {rows.length - 10} more rows
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Result */}
                {result && (
                  <div
                    className={`p-3 rounded-xl text-sm ${
                      result.imported
                        ? "bg-[rgba(62,199,141,.1)] text-green"
                        : "bg-[rgba(240,85,106,.1)] text-red"
                    }`}
                  >
                    {result.imported != null && (
                      <div className="font-semibold">
                        {result.imported} lead{result.imported !== 1 ? "s" : ""} imported
                        {result.skipped ? `, ${result.skipped} skipped` : ""}
                      </div>
                    )}
                    {result.errors && result.errors.length > 0 && (
                      <ul className="mt-1 space-y-0.5 text-xs text-txt-dim">
                        {result.errors.slice(0, 5).map((e, i) => (
                          <li key={i}>{e}</li>
                        ))}
                      </ul>
                    )}
                    {result.errors == null && !result.imported && (
                      <div>{JSON.stringify(result)}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between gap-3 p-5 border-t border-line flex-shrink-0">
                <span className="text-xs text-txt-faint">
                  {rows.length > 0
                    ? `${rows.length} row${rows.length !== 1 ? "s" : ""} ready`
                    : "No file selected"}
                </span>
                <div className="flex gap-2">
                  <button onClick={handleClose} className="btn btn-ghost">
                    Cancel
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={rows.length === 0 || importing}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {importing ? (
                      <>
                        <Icon name="Loader2" size={14} className="animate-spin" />
                        Importing…
                      </>
                    ) : (
                      <>
                        <Icon name="Upload" size={14} />
                        Import {rows.length > 0 ? `${rows.length} Lead${rows.length !== 1 ? "s" : ""}` : ""}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
