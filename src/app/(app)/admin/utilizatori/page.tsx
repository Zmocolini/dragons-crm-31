"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Plus, Trash2, ShieldCheck, User, Eye, EyeOff, Power } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils/cn";

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  createdAtIso: string;
  lastLoginIso: string | null;
};

const ROLE_LABEL: Record<string, string> = {
  global_owner: "Global Owner",
  subcontractor_owner: "Subcontractor",
};

export default function UsersAdminPage() {
  const { current } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"global_owner" | "subcontractor_owner">("subcontractor_owner");
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/users");
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Eroare"); return; }
      setUsers(j.users ?? []);
      setError(null);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const isGlobalOwner = current?.role === "global_owner";
  if (!isGlobalOwner) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 p-4 text-[13px] text-rose-100">
          Doar Global Owner poate accesa această pagină.
        </div>
      </div>
    );
  }

  const create = async () => {
    setCreateBusy(true); setCreateError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: newEmail, password: newPassword, name: newName, role: newRole }),
      });
      const j = await res.json();
      if (!res.ok) { setCreateError(j.error ?? "Eroare"); return; }
      setNewEmail(""); setNewPassword(""); setNewName(""); setNewRole("subcontractor_owner");
      setShowCreate(false);
      await refresh();
    } finally { setCreateBusy(false); }
  };

  const remove = async (u: UserRow) => {
    if (u.id === current.id) { alert("Nu-ți poți șterge propriul cont."); return; }
    if (!confirm(`Ștergi definitiv contul ${u.email}?`)) return;
    await fetch(`/api/admin/users/${u.id}`, { method: "DELETE" });
    await refresh();
  };

  const toggleActive = async (u: UserRow) => {
    if (u.id === current.id) { alert("Nu-ți poți dezactiva propriul cont."); return; }
    await fetch(`/api/admin/users/${u.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ active: !u.active }),
    });
    await refresh();
  };

  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-6">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-fg">Utilizatori CRM</h1>
          <p className="mt-0.5 text-[12.5px] text-fg-muted">
            Creează și gestionează conturile din CRM. Subcontractorii văd doar datele lor.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-2 text-[12.5px] font-semibold text-white"
        >
          <Plus size={13} /> Cont nou
        </button>
      </header>

      {showCreate && (
        <div className="mb-4 rounded-xl border border-violet-500/40 bg-violet-500/[0.06] p-4">
          <div className="mb-3 text-[13px] font-bold text-fg">Cont nou</div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-fg-dim">Nume</span>
              <input value={newName} onChange={(e) => setNewName(e.target.value)} className="rounded-md border border-line bg-card-2 px-3 py-2 text-[13px] text-fg" placeholder="ex. Husein" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-fg-dim">Email</span>
              <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="rounded-md border border-line bg-card-2 px-3 py-2 text-[13px] text-fg" placeholder="husein@dragonfleet.ro" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-fg-dim">Parolă (min 8)</span>
              <div className="relative">
                <input type={showNewPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full rounded-md border border-line bg-card-2 px-3 py-2 pr-9 text-[13px] text-fg" />
                <button type="button" onClick={() => setShowNewPassword((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 text-fg-muted hover:text-fg">
                  {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-fg-dim">Rol</span>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as "global_owner" | "subcontractor_owner")} className="rounded-md border border-line bg-card-2 px-3 py-2 text-[13px] text-fg">
                <option value="subcontractor_owner">Subcontractor</option>
                <option value="global_owner">Global Owner (acces total)</option>
              </select>
            </label>
          </div>
          {createError && (
            <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">{createError}</div>
          )}
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={create} disabled={createBusy} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[12.5px] font-semibold text-white disabled:opacity-50">
              {createBusy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />} Creează
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-line px-3 py-2 text-[12.5px] text-fg-muted hover:text-fg">Anulează</button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12.5px] text-rose-100">{error}</div>
      )}

      <div className="rounded-xl border border-line bg-card">
        {loading ? (
          <div className="p-6 text-center text-[12.5px] text-fg-muted">Se încarcă…</div>
        ) : users.length === 0 ? (
          <div className="p-6 text-center text-[12.5px] text-fg-muted">Niciun utilizator</div>
        ) : (
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-line/60 text-[11px] uppercase tracking-wider text-fg-dim">
              <tr>
                <th className="px-3 py-2.5">Nume / Email</th>
                <th className="px-3 py-2.5">Rol</th>
                <th className="px-3 py-2.5">Status</th>
                <th className="px-3 py-2.5">Ultimul login</th>
                <th className="w-24 px-3 py-2.5 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {users.map((u) => (
                <tr key={u.id} className={cn(!u.active && "opacity-50")}>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {u.role === "global_owner" ? <ShieldCheck size={14} className="text-amber-300" /> : <User size={14} className="text-cyan-300" />}
                      <div>
                        <div className="font-semibold text-fg">{u.name}</div>
                        <div className="text-[11px] text-fg-dim">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold", u.role === "global_owner" ? "border-amber-500/40 bg-amber-500/10 text-amber-200" : "border-cyan-500/40 bg-cyan-500/10 text-cyan-200")}>
                      {ROLE_LABEL[u.role] ?? u.role}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <span className={cn("rounded-md border px-1.5 py-0.5 text-[10.5px] font-semibold", u.active ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-rose-500/40 bg-rose-500/10 text-rose-200")}>
                      {u.active ? "Activ" : "Inactiv"}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-fg-muted text-[11px]">
                    {u.lastLoginIso ? new Date(u.lastLoginIso).toLocaleString("ro-RO") : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1">
                      <button type="button" onClick={() => toggleActive(u)} title={u.active ? "Dezactivează" : "Activează"} className="inline-flex h-6 w-6 items-center justify-center rounded border border-line text-fg-muted hover:bg-white/[0.06] hover:text-fg">
                        <Power size={11} />
                      </button>
                      <button type="button" onClick={() => remove(u)} title="Șterge" className="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20">
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
