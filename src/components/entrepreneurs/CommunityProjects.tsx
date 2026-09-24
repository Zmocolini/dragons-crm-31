"use client";

import { useCallback, useEffect, useState } from "react";
import { ExternalLink, Loader2, Plus, Trash2, User, X } from "lucide-react";
import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils/cn";

type Project = {
  id: string;
  title: string;
  description: string;
  category: string;
  url: string | null;
  createdByEmail: string;
  createdByName: string;
  createdAtIso: string;
};

export function CommunityProjects() {
  const { current } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/projects");
      const j = await res.json();
      if (res.ok) setProjects(j.projects ?? []);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title, description, category, url }),
      });
      const j = await res.json();
      if (!res.ok) { setError(j.error ?? "Eroare"); return; }
      setTitle(""); setDescription(""); setCategory(""); setUrl("");
      setAddOpen(false);
      await refresh();
    } finally { setBusy(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("Ștergi proiectul?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    await refresh();
  };

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[18px] font-bold text-fg">Proiecte membri</h2>
          <p className="text-[11.5px] text-fg-muted">Oricine poate posta un proiect. Vizibil pentru toți.</p>
        </div>
        <button
          type="button"
          onClick={() => setAddOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-blue-600 px-3 py-2 text-[12.5px] font-semibold text-white"
        >
          {addOpen ? <X size={13} /> : <Plus size={13} />}
          {addOpen ? "Anulează" : "Postează proiect"}
        </button>
      </div>

      {addOpen && (
        <div className="mb-4 rounded-2xl border border-violet-500/40 bg-violet-500/[0.06] p-4">
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-[11px] font-semibold text-fg-dim">Titlu *</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="ex. Curieri Cluj — parteneriat" className="rounded-md border border-line bg-card-2 px-3 py-2 text-[13px] text-fg" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-fg-dim">Categorie</span>
              <input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="ex. Transport, HoReCa, IT" className="rounded-md border border-line bg-card-2 px-3 py-2 text-[13px] text-fg" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-fg-dim">Link (opțional)</span>
              <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." className="rounded-md border border-line bg-card-2 px-3 py-2 text-[13px] text-fg" />
            </label>
            <label className="flex flex-col gap-1 md:col-span-2">
              <span className="text-[11px] font-semibold text-fg-dim">Descriere</span>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="Scurtă descriere a proiectului..." className="rounded-md border border-line bg-card-2 px-3 py-2 text-[13px] text-fg" />
            </label>
          </div>
          {error && <div className="mt-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-[12px] text-rose-100">{error}</div>}
          <button
            type="button"
            onClick={submit}
            disabled={!title.trim() || busy}
            className={cn("mt-3 inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-[12.5px] font-semibold text-white", (!title.trim() || busy) && "opacity-50")}
          >
            {busy ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
            Publică
          </button>
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-line bg-card p-6 text-center text-[12.5px] text-fg-muted">Se încarcă...</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-line bg-card p-8 text-center">
          <div className="text-[13px] font-semibold text-fg-muted">Niciun proiect încă</div>
          <p className="mt-1 text-[11.5px] text-fg-dim">Fii primul care postează.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => {
            const canDelete = current && (current.email === p.createdByEmail || current.role === "global_owner");
            return (
              <div key={p.id} className="group relative flex flex-col rounded-2xl border border-line bg-card p-4 transition-colors hover:border-violet-500/40">
                <div className="mb-2 flex items-start justify-between gap-2">
                  {p.category && (
                    <span className="rounded-md border border-violet-500/40 bg-violet-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-violet-200">
                      {p.category}
                    </span>
                  )}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={() => remove(p.id)}
                      title="Șterge"
                      className="inline-flex h-6 w-6 items-center justify-center rounded border border-rose-500/40 bg-rose-500/10 text-rose-300 opacity-0 hover:bg-rose-500/20 group-hover:opacity-100"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                </div>
                <div className="text-[15px] font-bold text-fg">{p.title}</div>
                {p.description && <p className="mt-1 text-[12px] text-fg-muted line-clamp-3">{p.description}</p>}
                {p.url && (
                  <a href={p.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1 text-[11.5px] font-semibold text-violet-300 hover:underline">
                    Vezi <ExternalLink size={10} />
                  </a>
                )}
                <div className="mt-3 flex items-center gap-1.5 border-t border-line/60 pt-2 text-[10.5px] text-fg-dim">
                  <User size={10} />
                  <span className="font-semibold text-fg-muted">{p.createdByName}</span>
                  <span>·</span>
                  <span>{new Date(p.createdAtIso).toLocaleDateString("ro-RO")}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
