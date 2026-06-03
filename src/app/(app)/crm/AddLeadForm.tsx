"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { JAIPUR_AREAS } from "@/lib/format";
import { Icon } from "@/components/Icon";

const PROPERTY_TYPES = ["2BHK", "3BHK", "4BHK", "Villa", "Plot", "Commercial", "Studio"];

const SOURCES = [
  { value: "WEBSITE", label: "Website" },
  { value: "REFERRAL", label: "Referral" },
  { value: "WALK_IN", label: "Walk-in" },
  { value: "PORTAL_99ACRES", label: "99acres" },
  { value: "PORTAL_MAGICBRICKS", label: "MagicBricks" },
  { value: "META_ADS", label: "Meta Ads" },
  { value: "GOOGLE_ADS", label: "Google Ads" },
  { value: "CHANNEL_PARTNER", label: "Channel Partner" },
  { value: "COLD_CALL", label: "Cold Call" },
  { value: "WHATSAPP", label: "WhatsApp" },
];

const TEMPERATURES = [
  { value: "HOT", label: "Hot" },
  { value: "WARM", label: "Warm" },
  { value: "COLD", label: "Cold" },
];

type UserRow = { id: string; name: string; avatarColor: string; role: string };

export default function AddLeadForm({
  users,
  onClose,
}: {
  users: UserRow[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    propertyType: "3BHK",
    location: JAIPUR_AREAS[0],
    source: "WEBSITE",
    temperature: "WARM",
    value: "",
    assignedToId: "",
    notes: "",
    nextFollowUp: "",
  });

  function set(key: keyof typeof form, val: string) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.phone.trim()) {
      setError("Name and phone are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          value: form.value ? Number(form.value) : 0,
          assignedToId: form.assignedToId || null,
          nextFollowUp: form.nextFollowUp || null,
          email: form.email || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to create lead.");
        return;
      }
      router.refresh();
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="card w-full max-w-lg max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-line flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="grid place-items-center w-8 h-8 rounded-lg bg-gold-soft text-gold-bright">
                <Icon name="UserPlus" size={16} />
              </div>
              <h3 className="font-display font-bold text-lg">Add New Lead</h3>
            </div>
            <button onClick={onClose} className="btn btn-ghost p-2">
              <Icon name="X" size={18} />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="field-label">Full Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="e.g. Rajesh Sharma"
                  className="input w-full mt-1"
                  required
                />
              </div>
              <div>
                <label className="field-label">Phone *</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                  className="input w-full mt-1"
                  required
                />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="optional"
                  className="input w-full mt-1"
                />
              </div>
              <div>
                <label className="field-label">Property Type *</label>
                <select
                  value={form.propertyType}
                  onChange={(e) => set("propertyType", e.target.value)}
                  className="input w-full mt-1"
                  required
                >
                  {PROPERTY_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Location *</label>
                <select
                  value={form.location}
                  onChange={(e) => set("location", e.target.value)}
                  className="input w-full mt-1"
                  required
                >
                  {JAIPUR_AREAS.map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Source</label>
                <select
                  value={form.source}
                  onChange={(e) => set("source", e.target.value)}
                  className="input w-full mt-1"
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Temperature</label>
                <select
                  value={form.temperature}
                  onChange={(e) => set("temperature", e.target.value)}
                  className="input w-full mt-1"
                >
                  {TEMPERATURES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Budget (₹)</label>
                <input
                  type="number"
                  value={form.value}
                  onChange={(e) => set("value", e.target.value)}
                  placeholder="e.g. 5000000"
                  className="input w-full mt-1"
                  min={0}
                />
              </div>
              <div>
                <label className="field-label">Assign To</label>
                <select
                  value={form.assignedToId}
                  onChange={(e) => set("assignedToId", e.target.value)}
                  className="input w-full mt-1"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Next Follow-up</label>
                <input
                  type="date"
                  value={form.nextFollowUp}
                  onChange={(e) => set("nextFollowUp", e.target.value)}
                  className="input w-full mt-1"
                />
              </div>
              <div className="col-span-2">
                <label className="field-label">Notes</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Any initial notes about this lead…"
                  className="input w-full mt-1 resize-none h-20"
                />
              </div>
            </div>

            {error && (
              <div className="text-red text-sm bg-[rgba(240,85,106,.1)] px-3 py-2 rounded-lg">
                {error}
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-5 border-t border-line flex-shrink-0">
            <button type="button" onClick={onClose} className="btn btn-ghost">
              Cancel
            </button>
            <button
              onClick={handleSubmit as any}
              disabled={saving}
              className="btn btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Icon name="Loader2" size={14} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Icon name="UserPlus" size={14} />
                  Add Lead
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
