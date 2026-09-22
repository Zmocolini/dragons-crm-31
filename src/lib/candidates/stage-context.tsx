"use client";

import {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
  type ReactNode,
} from "react";

// Kanban stages — decuplate de `Candidate.status` ca să evităm coupling fragil
// (statusul poate avea alte valori enum). Stocate ca overlay per candidateId.
// TODO(real-users): Drizzle `candidate_kanban_state` cu FK -> candidates.id + audit.

export type CandidateStage =
  | "leads_new"
  | "contacted"
  | "in_discussion"
  | "interview_scheduled"
  | "accepted";

export const STAGE_ORDER: CandidateStage[] = [
  "leads_new", "contacted", "in_discussion", "interview_scheduled", "accepted",
];

export const STAGE_LABEL: Record<CandidateStage, string> = {
  leads_new:           "Leaduri noi",
  contacted:           "Contactați",
  in_discussion:       "În discuție",
  interview_scheduled: "Interviu programat",
  accepted:            "Acceptați",
};

/** Stadiile care necesită confirmare la mutare (transformări importante). */
export const CONFIRM_STAGES: CandidateStage[] = ["accepted"];

export const STAGE_COLOR: Record<CandidateStage, {
  chip: string;   // badge count culoare
  border: string; // border-top pe coloană
  dot: string;    // punct pe titlu
}> = {
  leads_new:           { chip: "bg-blue-500/15 text-blue-300",     border: "border-t-blue-500/60",   dot: "bg-blue-400" },
  contacted:           { chip: "bg-sky-500/15 text-sky-300",       border: "border-t-sky-500/60",    dot: "bg-sky-400" },
  in_discussion:       { chip: "bg-amber-500/15 text-amber-300",   border: "border-t-amber-500/60",  dot: "bg-amber-400" },
  interview_scheduled: { chip: "bg-violet-500/15 text-violet-300", border: "border-t-violet-500/60", dot: "bg-violet-400" },
  accepted:            { chip: "bg-emerald-500/15 text-emerald-300", border: "border-t-emerald-500/60", dot: "bg-emerald-400" },
};

// ── Notes ──────────────────────────────────────────────────────────────────
export type CandidateNote = {
  id: string;
  text: string;
  authorName: string;
  createdAtIso: string;
  visibility: "private" | "team";
};

// ── Activities ────────────────────────────────────────────────────────────
export type CandidateActivityKind =
  | "created" | "stage_changed" | "note_added" | "call" | "message" | "email"
  | "whatsapp" | "interview" | "document_added" | "converted" | "rejected"
  | "responsible_changed" | "edited" | "import";

export const ACTIVITY_LABEL: Record<CandidateActivityKind, string> = {
  created:              "Creat",
  stage_changed:        "Stadiu schimbat",
  note_added:           "Notiță adăugată",
  call:                 "Apel",
  message:              "Mesaj",
  email:                "Email",
  whatsapp:             "WhatsApp",
  interview:            "Interviu",
  document_added:       "Document",
  converted:            "Convertit în curier",
  rejected:             "Respins",
  responsible_changed:  "Responsabil schimbat",
  edited:               "Editat",
  import:               "Importat",
};

export const ACTIVITY_DOT: Record<CandidateActivityKind, string> = {
  created:              "bg-blue-400",
  stage_changed:        "bg-violet-400",
  note_added:           "bg-slate-400",
  call:                 "bg-sky-400",
  message:              "bg-sky-400",
  email:                "bg-fuchsia-400",
  whatsapp:             "bg-emerald-400",
  interview:            "bg-violet-400",
  document_added:       "bg-orange-400",
  converted:            "bg-emerald-400",
  rejected:             "bg-rose-400",
  responsible_changed:  "bg-yellow-400",
  edited:               "bg-slate-400",
  import:               "bg-blue-400",
};

export type CandidateActivity = {
  id: string;
  kind: CandidateActivityKind;
  description: string;
  createdAtIso: string;
  actorName: string;
};

// ── Storage keys ──────────────────────────────────────────────────────────
const KEY_STAGES     = "crm31-candidate-stages";
const KEY_NOTES      = "crm31-candidate-notes";
const KEY_ACTIVITIES = "crm31-candidate-activities";
const KEY_LOST       = "crm31-candidate-lost";
const KEY_CONVERTED  = "crm31-candidate-converted";
const KEY_DELETED    = "crm31-candidate-deleted";
const KEY_OVERRIDES  = "crm31-candidate-overrides";
const KEY_RESPONSIBLES = "crm31-candidate-responsibles";

type StageContextValue = {
  hydrated: boolean;

  getStage: (candidateId: string) => CandidateStage;
  setStage: (candidateId: string, stage: CandidateStage) => void;

  notesByCandidate: Record<string, CandidateNote[]>;
  addNote: (candidateId: string, note: Omit<CandidateNote, "id" | "createdAtIso">) => CandidateNote;
  removeNote: (candidateId: string, noteId: string) => void;

  activitiesByCandidate: Record<string, CandidateActivity[]>;
  logActivity: (
    candidateId: string,
    kind: CandidateActivityKind,
    description: string,
    actorName: string,
  ) => void;

  markLost: (candidateId: string, reason: string, actorName: string) => void;
  markConverted: (candidateId: string, courierId: string, actorName: string) => void;
  markDeleted: (candidateId: string, actorName: string) => void;
  lostIds: Set<string>;
  convertedMap: Record<string, string>;
  deletedIds: Set<string>;

  /** Overrides pentru câmpuri editate — merged peste candidatul din CandidatesContext. */
  overrides: Record<string, Record<string, unknown>>;
  updateCandidate: (candidateId: string, patch: Record<string, unknown>, actorName: string) => void;

  /** Responsabil asignat per candidat (override peste createdBy). */
  responsibles: Record<string, string>;
  setResponsible: (candidateId: string, responsible: string, actorName: string) => void;
};

const StageContext = createContext<StageContextValue | null>(null);

function safeRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function CandidatesStageProvider({ children }: { children: ReactNode }) {
  const [stages, setStages] = useState<Record<string, CandidateStage>>({});
  const [notesByCandidate, setNotesByCandidate] = useState<Record<string, CandidateNote[]>>({});
  const [activitiesByCandidate, setActivitiesByCandidate] = useState<Record<string, CandidateActivity[]>>({});
  const [lostIds, setLostIds] = useState<Set<string>>(new Set());
  const [convertedMap, setConvertedMap] = useState<Record<string, string>>({});
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());
  const [overrides, setOverrides] = useState<Record<string, Record<string, unknown>>>({});
  const [responsibles, setResponsibles] = useState<Record<string, string>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setStages(safeRead<Record<string, CandidateStage>>(KEY_STAGES, {}));
    setNotesByCandidate(safeRead<Record<string, CandidateNote[]>>(KEY_NOTES, {}));
    setActivitiesByCandidate(safeRead<Record<string, CandidateActivity[]>>(KEY_ACTIVITIES, {}));
    setLostIds(new Set(safeRead<string[]>(KEY_LOST, [])));
    setConvertedMap(safeRead<Record<string, string>>(KEY_CONVERTED, {}));
    setDeletedIds(new Set(safeRead<string[]>(KEY_DELETED, [])));
    setOverrides(safeRead<Record<string, Record<string, unknown>>>(KEY_OVERRIDES, {}));
    setResponsibles(safeRead<Record<string, string>>(KEY_RESPONSIBLES, {}));
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_STAGES,     JSON.stringify(stages));                } catch {} }, [stages, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_NOTES,      JSON.stringify(notesByCandidate));      } catch {} }, [notesByCandidate, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_ACTIVITIES, JSON.stringify(activitiesByCandidate)); } catch {} }, [activitiesByCandidate, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_LOST,       JSON.stringify(Array.from(lostIds)));   } catch {} }, [lostIds, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_CONVERTED,  JSON.stringify(convertedMap));          } catch {} }, [convertedMap, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_DELETED,    JSON.stringify(Array.from(deletedIds))); } catch {} }, [deletedIds, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_OVERRIDES,  JSON.stringify(overrides));             } catch {} }, [overrides, hydrated]);
  useEffect(() => { if (hydrated) try { localStorage.setItem(KEY_RESPONSIBLES, JSON.stringify(responsibles));        } catch {} }, [responsibles, hydrated]);

  const getStage = useCallback((id: string): CandidateStage => stages[id] ?? "leads_new", [stages]);
  const setStage = useCallback((id: string, stage: CandidateStage) => {
    setStages((prev) => ({ ...prev, [id]: stage }));
  }, []);

  const addNote = useCallback(
    (candidateId: string, note: Omit<CandidateNote, "id" | "createdAtIso">) => {
      const created: CandidateNote = {
        ...note,
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        createdAtIso: new Date().toISOString(),
      };
      setNotesByCandidate((prev) => ({
        ...prev,
        [candidateId]: [created, ...(prev[candidateId] ?? [])],
      }));
      return created;
    },
    [],
  );

  const removeNote = useCallback((candidateId: string, noteId: string) => {
    setNotesByCandidate((prev) => ({
      ...prev,
      [candidateId]: (prev[candidateId] ?? []).filter((n) => n.id !== noteId),
    }));
  }, []);

  const logActivity = useCallback(
    (candidateId: string, kind: CandidateActivityKind, description: string, actorName: string) => {
      const created: CandidateActivity = {
        id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        kind, description, actorName,
        createdAtIso: new Date().toISOString(),
      };
      setActivitiesByCandidate((prev) => ({
        ...prev,
        [candidateId]: [created, ...(prev[candidateId] ?? [])].slice(0, 200),
      }));
    },
    [],
  );

  const markLost = useCallback((candidateId: string, reason: string, actorName: string) => {
    setLostIds((prev) => new Set(prev).add(candidateId));
    logActivity(candidateId, "rejected", `Marcat ca pierdut. Motiv: ${reason || "—"}`, actorName);
  }, [logActivity]);

  const markConverted = useCallback((candidateId: string, courierId: string, actorName: string) => {
    setConvertedMap((prev) => ({ ...prev, [candidateId]: courierId }));
    logActivity(candidateId, "converted", `Convertit în curier (ID: ${courierId})`, actorName);
  }, [logActivity]);

  const markDeleted = useCallback((candidateId: string, actorName: string) => {
    setDeletedIds((prev) => new Set(prev).add(candidateId));
    logActivity(candidateId, "edited", `Șters din pipeline de ${actorName}`, actorName);
  }, [logActivity]);

  const updateCandidate = useCallback((candidateId: string, patch: Record<string, unknown>, actorName: string) => {
    setOverrides((prev) => ({
      ...prev,
      [candidateId]: { ...(prev[candidateId] ?? {}), ...patch },
    }));
    const summary = Object.keys(patch).join(", ");
    logActivity(candidateId, "edited", `Câmpuri modificate: ${summary}`, actorName);
  }, [logActivity]);

  const setResponsible = useCallback((candidateId: string, responsible: string, actorName: string) => {
    setResponsibles((prev) => ({ ...prev, [candidateId]: responsible }));
    logActivity(candidateId, "responsible_changed", `Responsabil nou: ${responsible}`, actorName);
  }, [logActivity]);

  const value = useMemo<StageContextValue>(
    () => ({
      hydrated,
      getStage, setStage,
      notesByCandidate, addNote, removeNote,
      activitiesByCandidate, logActivity,
      markLost, markConverted, markDeleted, lostIds, convertedMap, deletedIds,
      overrides, updateCandidate, responsibles, setResponsible,
    }),
    [hydrated, getStage, setStage, notesByCandidate, addNote, removeNote,
     activitiesByCandidate, logActivity, markLost, markConverted, markDeleted,
     lostIds, convertedMap, deletedIds, overrides, updateCandidate, responsibles, setResponsible],
  );

  return <StageContext.Provider value={value}>{children}</StageContext.Provider>;
}

export function useCandidatesStage() {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error("useCandidatesStage must be used within <CandidatesStageProvider>");
  return ctx;
}
