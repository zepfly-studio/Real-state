"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, Badge, EmptyState } from "@/components/ui";
import { Icon } from "@/components/Icon";
import { initials, timeAgo } from "@/lib/format";
import { Role } from "@prisma/client";
import { type ModuleDef, type ModuleGroup, MODULE_GROUPS } from "@/lib/modules";
import { Loader2, X, Plus, Pencil, Check } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TeamUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  phone: string | null;
  isActive: boolean;
  lastActiveAt: string | null;
  createdAt: string;
}

interface PermRow {
  id: string;
  tenantId: string;
  role: Role;
  moduleKey: string;
  canView: boolean;
  canEdit: boolean;
}

interface AuditEntry {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  createdAt: string;
  meta: Record<string, unknown>;
  performedBy: { id: string; name: string; avatarColor: string } | null;
}

interface Props {
  initialUsers: TeamUser[];
  modulePermissions: PermRow[];
  auditLogs: AuditEntry[];
  modules: ModuleDef[];
  currentUserId: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MATRIX_ROLES: Role[] = ["ADMIN", "MANAGER", "EMPLOYEE", "CLIENT", "CHANNEL_PARTNER"];

const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  EMPLOYEE: "Employee",
  CLIENT: "Client",
  CHANNEL_PARTNER: "Channel Partner",
};

const ROLE_TONES: Record<Role, "gold" | "green" | "blue" | "purple" | "red" | "neutral"> = {
  SUPER_ADMIN: "red",
  ADMIN: "gold",
  MANAGER: "blue",
  EMPLOYEE: "green",
  CLIENT: "purple",
  CHANNEL_PARTNER: "neutral",
};

const ACTION_ICONS: Record<string, string> = {
  USER_CREATED: "UserPlus",
  USER_UPDATED: "UserCog",
  PERMISSION_UPDATED: "ShieldCheck",
  TENANT_CREATED: "Building2",
  TENANT_ACTIVATED: "Power",
  TENANT_SUSPENDED: "PowerOff",
  CREATE: "Plus",
  UPDATE: "Pencil",
  DELETE: "Trash2",
};

// ─── Avatar component ─────────────────────────────────────────────────────────

function Avatar({ name, color, size = 36 }: { name: string; color: string; size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-full font-display font-bold shrink-0 text-[#1a1205]"
      style={{ width: size, height: size, background: color, fontSize: size * 0.35 }}
    >
      {initials(name)}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function TeamClient({
  initialUsers,
  modulePermissions,
  auditLogs,
  modules,
  currentUserId,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"members" | "matrix" | "activity">("members");

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-bg-2 p-1 rounded-xl w-fit">
        {(
          [
            { key: "members", label: "Team Members", icon: "Users" },
            { key: "matrix", label: "Permission Matrix", icon: "ShieldCheck" },
            { key: "activity", label: "Activity Log", icon: "Activity" },
          ] as const
        ).map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              tab === key
                ? "bg-gold text-[#1a1205]"
                : "text-txt-dim hover:text-txt"
            }`}
          >
            <Icon name={icon} size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === "members" && (
        <MembersTab
          users={initialUsers}
          currentUserId={currentUserId}
          onRefresh={() => router.refresh()}
        />
      )}
      {tab === "matrix" && (
        <PermissionMatrixTab
          modules={modules}
          modulePermissions={modulePermissions}
        />
      )}
      {tab === "activity" && (
        <ActivityLogTab auditLogs={auditLogs} />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 1 — Team Members
// ═══════════════════════════════════════════════════════════════════════════════

function MembersTab({
  users,
  currentUserId,
  onRefresh,
}: {
  users: TeamUser[];
  currentUserId: string;
  onRefresh: () => void;
}) {
  const [showAdd, setShowAdd] = useState(false);
  const [editUser, setEditUser] = useState<TeamUser | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    role: "EMPLOYEE" as Role,
    phone: "",
  });

  function setF<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function createUser() {
    setBusy("create");
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setBusy(null);
    if (res.ok) {
      setShowAdd(false);
      setForm({ name: "", email: "", role: "EMPLOYEE", phone: "" });
      onRefresh();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed to create user");
    }
  }

  async function saveEdit() {
    if (!editUser) return;
    setBusy("edit");
    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editUser.name, role: editUser.role }),
    });
    setBusy(null);
    if (res.ok) {
      setEditUser(null);
      onRefresh();
    } else {
      const j = await res.json().catch(() => ({}));
      alert(j.error || "Failed to update user");
    }
  }

  async function toggleActive(u: TeamUser) {
    setBusy(u.id);
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !u.isActive }),
    });
    setBusy(null);
    if (res.ok) {
      onRefresh();
    } else {
      alert("Failed to update status");
    }
  }

  const activeCount = users.filter((u) => u.isActive).length;

  return (
    <div>
      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {[
          { label: "Total Members", value: users.length, icon: "Users", accent: "text-gold-bright" },
          { label: "Active", value: activeCount, icon: "UserCheck", accent: "text-green" },
          { label: "Inactive", value: users.length - activeCount, icon: "UserX", accent: "text-red" },
          { label: "Roles", value: new Set(users.map((u) => u.role)).size, icon: "Shield", accent: "text-blue" },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] uppercase tracking-wide text-txt-faint font-semibold">{s.label}</span>
              <span className={s.accent}><Icon name={s.icon} size={16} /></span>
            </div>
            <div className="font-display text-2xl font-bold">{s.value}</div>
          </Card>
        ))}
      </div>

      {/* Table header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg">All Members</h3>
        <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Add Member
        </button>
      </div>

      {users.length === 0 ? (
        <EmptyState
          icon="Users"
          title="No team members yet"
          hint="Add your first team member to get started."
          action={
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>
              <Plus size={15} /> Add Member
            </button>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-txt-faint text-[11px] uppercase tracking-wide">
                <th className="text-left py-3 px-4 font-semibold">Member</th>
                <th className="text-left py-3 px-4 font-semibold">Role</th>
                <th className="text-left py-3 px-4 font-semibold hidden md:table-cell">Status</th>
                <th className="text-left py-3 px-4 font-semibold hidden lg:table-cell">Last Active</th>
                <th className="py-3 px-4" />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-line last:border-0 hover:bg-bg-2/50 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar name={u.name} color={u.avatarColor} size={36} />
                      <div>
                        <div className="font-semibold leading-tight">{u.name}</div>
                        <div className="text-xs text-txt-faint">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge tone={ROLE_TONES[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                        u.isActive ? "text-green" : "text-txt-faint"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${u.isActive ? "bg-green" : "bg-txt-faint"}`}
                      />
                      {u.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="py-3 px-4 hidden lg:table-cell text-txt-dim text-xs">
                    {u.lastActiveAt ? timeAgo(u.lastActiveAt) : "Never"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      {u.id !== currentUserId && (
                        <>
                          <button
                            className="btn btn-ghost py-1 px-2 text-xs"
                            onClick={() => setEditUser({ ...u })}
                            title="Edit"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            className={`btn btn-ghost py-1 px-2 text-xs ${
                              u.isActive ? "hover:text-red" : "hover:text-green"
                            }`}
                            onClick={() => toggleActive(u)}
                            disabled={busy === u.id}
                            title={u.isActive ? "Deactivate" : "Activate"}
                          >
                            {busy === u.id ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Icon name={u.isActive ? "UserX" : "UserCheck"} size={13} />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg">Add Team Member</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="text-txt-faint hover:text-txt"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="field-label">Full Name</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setF("name", e.target.value)}
                  placeholder="Rahul Sharma"
                />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input
                  className="input"
                  type="email"
                  value={form.email}
                  onChange={(e) => setF("email", e.target.value)}
                  placeholder="rahul@shubhrealtors.in"
                />
              </div>
              <div>
                <label className="field-label">Role</label>
                <select
                  className="input"
                  value={form.role}
                  onChange={(e) => setF("role", e.target.value)}
                >
                  {(["ADMIN", "MANAGER", "EMPLOYEE", "CLIENT", "CHANNEL_PARTNER"] as Role[]).map(
                    (r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="field-label">Phone (optional)</label>
                <input
                  className="input"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setF("phone", e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <p className="text-[11px] text-txt-faint bg-bg-2 rounded-lg px-3 py-2">
                A temporary password{" "}
                <span className="text-gold-bright font-semibold">password123</span> will be set.
                The member should change it after first login.
              </p>
            </div>

            <div className="flex gap-2 mt-5">
              <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary ml-auto"
                disabled={!form.name || !form.email || busy === "create"}
                onClick={createUser}
              >
                {busy === "create" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <>
                    <Plus size={15} /> Add Member
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <Card className="w-full max-w-md p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display font-bold text-lg">Edit Member</h3>
              <button
                onClick={() => setEditUser(null)}
                className="text-txt-faint hover:text-txt"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex items-center gap-3 mb-5 p-3 bg-bg-2 rounded-xl">
              <Avatar name={editUser.name} color={editUser.avatarColor} size={42} />
              <div>
                <div className="font-semibold">{editUser.name}</div>
                <div className="text-xs text-txt-faint">{editUser.email}</div>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="field-label">Full Name</label>
                <input
                  className="input"
                  value={editUser.name}
                  onChange={(e) => setEditUser({ ...editUser, name: e.target.value })}
                />
              </div>
              <div>
                <label className="field-label">Role</label>
                <select
                  className="input"
                  value={editUser.role}
                  onChange={(e) =>
                    setEditUser({ ...editUser, role: e.target.value as Role })
                  }
                >
                  {(["ADMIN", "MANAGER", "EMPLOYEE", "CLIENT", "CHANNEL_PARTNER"] as Role[]).map(
                    (r) => (
                      <option key={r} value={r}>
                        {ROLE_LABELS[r]}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button className="btn btn-ghost" onClick={() => setEditUser(null)}>
                Cancel
              </button>
              <button
                className="btn btn-primary ml-auto"
                disabled={!editUser.name || busy === "edit"}
                onClick={saveEdit}
              >
                {busy === "edit" ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <>
                    <Check size={15} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 2 — Permission Matrix
// ═══════════════════════════════════════════════════════════════════════════════

function PermissionMatrixTab({
  modules,
  modulePermissions,
}: {
  modules: ModuleDef[];
  modulePermissions: PermRow[];
}) {
  // Local state for optimistic updates
  const [perms, setPerms] = useState<PermRow[]>(modulePermissions);
  const [saving, setSaving] = useState<string | null>(null); // key = `${role}::${moduleKey}`

  function getCanView(role: Role, moduleKey: string): boolean {
    const perm = perms.find((p) => p.role === role && p.moduleKey === moduleKey);
    if (perm) return perm.canView;
    // Fallback to module default
    const mod = modules.find((m) => m.key === moduleKey);
    return mod ? mod.roles.includes(role) : false;
  }

  async function togglePerm(role: Role, moduleKey: string) {
    const key = `${role}::${moduleKey}`;
    const current = getCanView(role, moduleKey);
    const next = !current;

    // Optimistic update
    setPerms((prev) => {
      const existing = prev.find((p) => p.role === role && p.moduleKey === moduleKey);
      if (existing) {
        return prev.map((p) =>
          p.role === role && p.moduleKey === moduleKey ? { ...p, canView: next } : p
        );
      }
      return [
        ...prev,
        {
          id: `temp_${key}`,
          tenantId: "",
          role,
          moduleKey,
          canView: next,
          canEdit: false,
        },
      ];
    });

    setSaving(key);
    const res = await fetch("/api/permissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, moduleKey, canView: next }),
    });
    setSaving(null);

    if (!res.ok) {
      // Revert
      setPerms((prev) => {
        const existing = prev.find((p) => p.role === role && p.moduleKey === moduleKey);
        if (existing) {
          return prev.map((p) =>
            p.role === role && p.moduleKey === moduleKey ? { ...p, canView: current } : p
          );
        }
        return prev.filter((p) => !(p.role === role && p.moduleKey === moduleKey));
      });
      alert("Failed to update permission");
    } else {
      const updated = await res.json();
      setPerms((prev) =>
        prev.map((p) =>
          p.role === role && p.moduleKey === moduleKey ? { ...updated } : p
        )
      );
    }
  }

  async function resetToDefaults() {
    if (!confirm("Reset all permissions to module defaults? This will call the API for each module × role.")) return;
    const updates: Array<{ role: Role; moduleKey: string; canView: boolean }> = [];
    for (const mod of modules) {
      for (const role of MATRIX_ROLES) {
        const defaultVal = mod.roles.includes(role);
        updates.push({ role, moduleKey: mod.key, canView: defaultVal });
      }
    }

    // Reset local state immediately
    setPerms((prev) => {
      const next = [...prev];
      for (const u of updates) {
        const idx = next.findIndex((p) => p.role === u.role && p.moduleKey === u.moduleKey);
        if (idx !== -1) {
          next[idx] = { ...next[idx], canView: u.canView };
        }
      }
      return next;
    });

    // Fire all updates in parallel
    await Promise.all(
      updates.map((u) =>
        fetch("/api/permissions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(u),
        })
      )
    );
  }

  const groupedModules = useMemo(
    () =>
      MODULE_GROUPS.reduce<Record<ModuleGroup, ModuleDef[]>>(
        (acc, g) => {
          acc[g] = modules.filter((m) => m.group === g);
          return acc;
        },
        { "LEAD GENERATION": [], WORKSPACE: [], "HEAVY TOOLS & AI": [], ADMIN: [] }
      ),
    [modules]
  );

  return (
    <div>
      {/* Hint banner */}
      <div className="card p-4 mb-5 flex items-start gap-3 border-dashed">
        <div className="grid place-items-center w-9 h-9 rounded-lg bg-gold-soft text-gold-bright shrink-0">
          <Icon name="Info" size={16} />
        </div>
        <div className="text-sm text-txt-dim">
          <span className="text-txt font-semibold">Live permissions.</span> Toggling a cell
          immediately updates sidebar visibility and route access for all users with that role.
          SUPER_ADMIN always sees everything and cannot be restricted.
        </div>
        <button
          className="btn btn-ghost ml-auto text-xs shrink-0"
          onClick={resetToDefaults}
        >
          <Icon name="RotateCcw" size={13} /> Reset to defaults
        </button>
      </div>

      {/* Matrix */}
      <Card className="overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-line">
              <th className="text-left py-3 px-4 font-semibold text-txt-dim text-[11px] uppercase tracking-wide w-52">
                Module
              </th>
              {MATRIX_ROLES.map((role) => (
                <th
                  key={role}
                  className="py-3 px-3 text-center font-semibold text-[11px] uppercase tracking-wide"
                >
                  <Badge tone={ROLE_TONES[role]}>{ROLE_LABELS[role]}</Badge>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MODULE_GROUPS.map((group) => {
              const groupMods = groupedModules[group];
              if (groupMods.length === 0) return null;
              return (
                <React.Fragment key={group}>
                  {/* Group header row */}
                  <tr className="bg-bg-2/60">
                    <td
                      colSpan={MATRIX_ROLES.length + 1}
                      className="py-2 px-4 text-[10px] font-bold uppercase tracking-widest text-txt-faint section-label"
                    >
                      {group}
                    </td>
                  </tr>
                  {groupMods.map((mod) => (
                    <tr
                      key={mod.key}
                      className="border-b border-line last:border-0 hover:bg-bg-2/30 transition-colors"
                    >
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-2">
                          <Icon name={mod.icon} size={14} className="text-txt-faint" />
                          <span className="text-txt font-medium">{mod.label}</span>
                        </div>
                      </td>
                      {MATRIX_ROLES.map((role) => {
                        const key = `${role}::${mod.key}`;
                        const on = getCanView(role, mod.key);
                        const isSaving = saving === key;
                        return (
                          <td key={role} className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => togglePerm(role, mod.key)}
                              disabled={isSaving}
                              className={`relative inline-flex items-center justify-center w-10 h-6 rounded-full transition-all ${
                                on ? "bg-gold" : "bg-bg-2 border border-line"
                              }`}
                              title={`${ROLE_LABELS[role]}: ${on ? "can view" : "hidden"}`}
                            >
                              {isSaving ? (
                                <Loader2
                                  size={11}
                                  className={`animate-spin ${on ? "text-[#1a1205]" : "text-txt-faint"}`}
                                />
                              ) : (
                                <span
                                  className={`block w-4 h-4 rounded-full transition-all ${
                                    on
                                      ? "bg-[#1a1205] translate-x-2"
                                      : "bg-txt-faint -translate-x-2"
                                  }`}
                                />
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB 3 — Activity Log
// ═══════════════════════════════════════════════════════════════════════════════

function ActivityLogTab({ auditLogs }: { auditLogs: AuditEntry[] }) {
  if (auditLogs.length === 0) {
    return (
      <EmptyState
        icon="Activity"
        title="No activity yet"
        hint="Actions by your team will appear here."
      />
    );
  }

  function metaSummary(meta: Record<string, unknown>): string {
    if (!meta || Object.keys(meta).length === 0) return "";
    const parts: string[] = [];
    if (meta.name) parts.push(String(meta.name));
    if (meta.email) parts.push(String(meta.email));
    if (meta.role) parts.push(String(meta.role));
    if (meta.moduleKey) parts.push(`module: ${meta.moduleKey}`);
    if (meta.changes && typeof meta.changes === "object") {
      const c = meta.changes as Record<string, unknown>;
      if (c.role) parts.push(`→ ${c.role}`);
      if (c.isActive !== undefined) parts.push(c.isActive ? "activated" : "deactivated");
    }
    if (meta.canView !== undefined) {
      parts.push(meta.canView ? "enabled" : "disabled");
    }
    return parts.join(" · ");
  }

  function actionLabel(action: string, entity: string): string {
    const map: Record<string, string> = {
      USER_CREATED: "Added user",
      USER_UPDATED: "Updated user",
      PERMISSION_UPDATED: "Changed permission",
      TENANT_CREATED: "Created tenant",
      TENANT_ACTIVATED: "Activated tenant",
      TENANT_SUSPENDED: "Suspended tenant",
      CREATE: `Created ${entity}`,
      UPDATE: `Updated ${entity}`,
      DELETE: `Deleted ${entity}`,
    };
    return map[action] ?? `${action} · ${entity}`;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-lg">Activity Timeline</h3>
        <span className="text-xs text-txt-faint">Last 50 actions</span>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="divide-y divide-line">
          {auditLogs.map((log, idx) => {
            const iconName = ACTION_ICONS[log.action] ?? "Zap";
            const summary = metaSummary(log.meta);
            return (
              <div key={log.id} className="flex items-start gap-4 px-5 py-4 hover:bg-bg-2/40 transition-colors">
                {/* Timeline line + icon */}
                <div className="relative flex flex-col items-center">
                  <div className="grid place-items-center w-8 h-8 rounded-xl bg-gold-soft text-gold-bright shrink-0">
                    <Icon name={iconName} size={14} />
                  </div>
                  {idx < auditLogs.length - 1 && (
                    <div className="absolute top-8 bottom-0 left-1/2 -translate-x-1/2 w-px bg-line h-full" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <span className="font-semibold text-sm">
                      {actionLabel(log.action, log.entity)}
                    </span>
                    {log.performedBy && (
                      <span className="text-xs text-txt-dim">
                        by{" "}
                        <span className="text-txt font-medium">{log.performedBy.name}</span>
                      </span>
                    )}
                  </div>
                  {summary && (
                    <p className="text-xs text-txt-faint mt-0.5 truncate">{summary}</p>
                  )}
                </div>

                {/* Time */}
                <div className="text-xs text-txt-faint shrink-0 pt-1">{timeAgo(log.createdAt)}</div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
