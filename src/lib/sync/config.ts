// Colecțiile sincronizate între device-uri prin /api/sync (tabela `crm_records`).
// Fiecare cheie localStorage e spartă în înregistrări (per id); fiecare înregistrare are un
// proprietar (email). Serverul trimite unui cont DOAR înregistrările lui — Global Owner vede tot.
//
// owner:
//   "createdBy" — proprietar = câmpul `createdBy` (email) al înregistrării
//   "parent"    — proprietar = proprietarul înregistrării părinte cu același id (ex. note pe o plată)
//   "writer"    — proprietar = contul care a creat înregistrarea

export type SyncOwnerRule = "createdBy" | "parent" | "writer";
export type SyncKind = "list" | "set" | "map";

export type SyncCollection = { key: string; owner: SyncOwnerRule; parent?: string };

export const SYNC_COLLECTIONS: SyncCollection[] = [
  { key: "crm31-couriers",          owner: "createdBy" },
  { key: "crm31-couriers-deleted",  owner: "parent", parent: "crm31-couriers" },

  { key: "crm31-payments",           owner: "createdBy" },
  { key: "crm31-payment-patches",    owner: "parent", parent: "crm31-payments" },
  { key: "crm31-payment-activities", owner: "parent", parent: "crm31-payments" },
  { key: "crm31-payment-notes",      owner: "parent", parent: "crm31-payments" },
  { key: "crm31-payment-documents",  owner: "parent", parent: "crm31-payments" },
  { key: "crm31-payment-deleted",    owner: "parent", parent: "crm31-payments" },

  { key: "crm31-candidates",             owner: "writer" },
  { key: "crm31-candidate-stages",       owner: "parent", parent: "crm31-candidates" },
  { key: "crm31-candidate-notes",        owner: "parent", parent: "crm31-candidates" },
  { key: "crm31-candidate-activities",   owner: "parent", parent: "crm31-candidates" },
  { key: "crm31-candidate-lost",         owner: "parent", parent: "crm31-candidates" },
  { key: "crm31-candidate-converted",    owner: "parent", parent: "crm31-candidates" },
  { key: "crm31-candidate-deleted",      owner: "parent", parent: "crm31-candidates" },
  { key: "crm31-candidate-overrides",    owner: "parent", parent: "crm31-candidates" },
  { key: "crm31-candidate-responsibles", owner: "parent", parent: "crm31-candidates" },

  { key: "crm31-documents",         owner: "writer" },
  { key: "crm31-document-patches",  owner: "parent", parent: "crm31-documents" },
  { key: "crm31-document-deleted",  owner: "parent", parent: "crm31-documents" },
  { key: "crm31-document-activity", owner: "writer" },
  { key: "crm31-document-notes",    owner: "writer" },

  { key: "crm31-fleet-vehicles",            owner: "writer" },
  { key: "crm31-vehicle-rentals",           owner: "writer" },
  { key: "crm31-fleet-accommodations",      owner: "writer" },
  { key: "crm31-accommodation-assignments", owner: "writer" },
  { key: "crm31-invoices",                  owner: "writer" },
  { key: "crm31-econtracts",                owner: "writer" },
  { key: "crm31-duplicate-pairs",           owner: "writer" },
  { key: "crm31-subcontractors-added",      owner: "writer" },
  // Task-uri ridicate de subcontractori către owner (activări, mutări, tichete).
  { key: "crm31-fleet-tasks",               owner: "createdBy" },
];

export const SYNC_BY_KEY = new Map(SYNC_COLLECTIONS.map((c) => [c.key, c]));

/** ID-ul flotei e același pe toate device-urile (separarea între conturi o face serverul
 *  prin proprietar). Înregistrările sincronizate sunt normalizate la acest ID. */
export const CANONICAL_FLEET_ID = "t_default";

export const MAX_RECORD_BYTES = 1_000_000;
export const MAX_OPS_PER_REQUEST = 200;

export type SyncOp = { k: string; id: string; kind: SyncKind; data: string | null; del: boolean };
export type SyncRow = { k: string; id: string; kind: SyncKind; data: string | null; del: boolean; ts: number };
