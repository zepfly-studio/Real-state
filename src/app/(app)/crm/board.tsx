"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
} from "@dnd-kit/core";
import { useRouter } from "next/navigation";
import { inr, initials } from "@/lib/format";
import { Icon } from "@/components/Icon";
import LeadDrawer from "./LeadDrawer";

// ─── Types ───────────────────────────────────────────────────
export type LeadRow = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  propertyType: string;
  location: string;
  source: string;
  temperature: string;
  stage: string;
  value: number;
  assignedToId: string | null;
  notes: string | null;
  nextFollowUp: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo: { id: string; name: string; avatarColor: string } | null;
};

export type UserRow = {
  id: string;
  name: string;
  avatarColor: string;
  role: string;
};

// ─── Stage config ────────────────────────────────────────────
const STAGES: {
  key: string;
  label: string;
  color: string;
  muted?: boolean;
}[] = [
  { key: "NEW", label: "New", color: "#5b8def" },
  { key: "CONTACTED", label: "Contacted", color: "#9b7ef0" },
  { key: "SITE_VISIT", label: "Site Visit", color: "#f0c14b" },
  { key: "NEGOTIATION", label: "Negotiation", color: "#d9a441" },
  { key: "CLOSED_WON", label: "Closed Won", color: "#3ec78d" },
  { key: "CLOSED_LOST", label: "Closed Lost", color: "#f0556a", muted: true },
];

// ─── Temperature helpers ──────────────────────────────────────
function TempTag({ temp }: { temp: string }) {
  const cls =
    temp === "HOT"
      ? "tag-hot"
      : temp === "WARM"
      ? "tag-warm"
      : "tag-cold";
  return (
    <span className={`tag ${cls} text-[10px] font-bold uppercase`}>{temp}</span>
  );
}

// ─── Draggable Lead Card ──────────────────────────────────────
function LeadCard({
  lead,
  onClick,
}: {
  lead: LeadRow;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`card p-3 cursor-pointer hover:border-gold/40 border border-transparent transition-all select-none ${
        isDragging ? "opacity-40" : ""
      }`}
      style={{ touchAction: "none" }}
    >
      <LeadCardInner lead={lead} />
    </div>
  );
}

function LeadCardInner({ lead }: { lead: LeadRow }) {
  return (
    <>
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-semibold text-sm leading-tight truncate">{lead.name}</span>
        <TempTag temp={lead.temperature} />
      </div>
      <div className="text-[11px] text-txt-dim mb-2 truncate">
        {lead.propertyType} &middot; {lead.location} &middot; {lead.source.replace(/_/g, " ")}
      </div>
      <div className="flex items-center gap-1 mb-2 text-[11px] text-txt-dim">
        <Icon name="Phone" size={11} />
        <span>{lead.phone}</span>
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-gold-bright font-semibold text-sm">{inr(lead.value)}</span>
        {lead.assignedTo && (
          <span
            className="grid place-items-center w-6 h-6 rounded-full text-[10px] font-bold text-[#1a1205]"
            style={{ background: lead.assignedTo.avatarColor }}
            title={lead.assignedTo.name}
          >
            {initials(lead.assignedTo.name)}
          </span>
        )}
      </div>
    </>
  );
}

// ─── Droppable Column ─────────────────────────────────────────
function KanbanColumn({
  stage,
  leads,
  onCardClick,
}: {
  stage: (typeof STAGES)[0];
  leads: LeadRow[];
  onCardClick: (lead: LeadRow) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.key });
  const total = leads.reduce((s, l) => s + l.value, 0);

  return (
    <div className="flex-shrink-0 w-64">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
          style={{ background: stage.color }}
        />
        <span
          className={`font-semibold text-sm ${stage.muted ? "text-txt-faint" : "text-txt"}`}
        >
          {stage.label}
        </span>
        <span className="ml-auto text-[11px] text-txt-faint bg-panel-2 px-1.5 py-0.5 rounded-full font-medium">
          {leads.length}
        </span>
      </div>
      {total > 0 && (
        <div className="text-[10px] text-txt-faint mb-2 px-1">
          {inr(total)}
        </div>
      )}

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`min-h-[200px] space-y-2 rounded-xl p-2 transition-colors ${
          isOver
            ? "bg-gold-soft/20 border-2 border-dashed border-gold/40"
            : "bg-panel/40"
        }`}
      >
        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onCardClick(lead)}
          />
        ))}
        {leads.length === 0 && (
          <div className="flex items-center justify-center h-16 text-txt-faint text-xs">
            Drop here
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Board ───────────────────────────────────────────────
export default function KanbanBoard({
  leads: initialLeads,
  users,
}: {
  leads: LeadRow[];
  users: UserRow[];
}) {
  const router = useRouter();
  const [leads, setLeads] = useState<LeadRow[]>(initialLeads);
  const [activeLeadId, setActiveLeadId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadRow | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const handleDragStart = useCallback((e: DragStartEvent) => {
    setActiveLeadId(String(e.active.id));
  }, []);

  const handleDragEnd = useCallback(
    async (e: DragEndEvent) => {
      setActiveLeadId(null);
      const { active, over } = e;
      if (!over) return;
      const leadId = String(active.id);
      const newStage = String(over.id);
      const lead = leads.find((l) => l.id === leadId);
      if (!lead || lead.stage === newStage) return;

      // Optimistic update
      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
      );

      try {
        await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: newStage }),
        });
        router.refresh();
      } catch {
        // Revert on error
        setLeads((prev) =>
          prev.map((l) => (l.id === leadId ? { ...l, stage: lead.stage } : l))
        );
      }
    },
    [leads, router]
  );

  const activeLead = activeLeadId
    ? leads.find((l) => l.id === activeLeadId) ?? null
    : null;

  const openDrawer = useCallback((lead: LeadRow) => {
    setSelectedLead(lead);
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setSelectedLead(null);
  }, []);

  const handleLeadUpdate = useCallback((updated: Partial<LeadRow> & { id: string }) => {
    setLeads((prev) =>
      prev.map((l) => (l.id === updated.id ? { ...l, ...updated } : l))
    );
    if (selectedLead?.id === updated.id) {
      setSelectedLead((prev) => (prev ? { ...prev, ...updated } : prev));
    }
  }, [selectedLead]);

  return (
    <>
      <div className="overflow-x-auto pb-4">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 min-w-max">
            {STAGES.map((stage) => (
              <KanbanColumn
                key={stage.key}
                stage={stage}
                leads={leads.filter((l) => l.stage === stage.key)}
                onCardClick={openDrawer}
              />
            ))}
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="card p-3 w-64 shadow-2xl border border-gold/30 opacity-95 rotate-1">
                <LeadCardInner lead={activeLead} />
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Lead Drawer */}
      {drawerOpen && selectedLead && (
        <LeadDrawer
          lead={selectedLead}
          users={users}
          onClose={closeDrawer}
          onUpdate={handleLeadUpdate}
        />
      )}
    </>
  );
}
