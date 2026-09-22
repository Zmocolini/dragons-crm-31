// Contracte proprii de flotă + integrare cu serviciu extern de semnare (mock).
// TODO(real-users): swap la eContract.ro / DocuSign / Adobe Sign / SPV via webhook + OAuth.

export type ContractPartyType = "courier" | "subcontractor" | "accommodation_owner" | "supplier" | "other";

export const CONTRACT_PARTY_LABEL: Record<ContractPartyType, string> = {
  courier:             "Curier",
  subcontractor:       "Subcontractor",
  accommodation_owner: "Proprietar cazare",
  supplier:            "Furnizor",
  other:               "Altă parte",
};

export type ContractKind =
  | "comodat_vehicul"
  | "colaborare_curier"
  | "subcontractare"
  | "inchiriere_cazare"
  | "servicii"
  | "confidentialitate"
  | "altul";

export const CONTRACT_KIND_LABEL: Record<ContractKind, string> = {
  comodat_vehicul:     "Comodat vehicul",
  colaborare_curier:   "Colaborare curier",
  subcontractare:      "Subcontractare",
  inchiriere_cazare:   "Închiriere cazare",
  servicii:            "Contract servicii",
  confidentialitate:   "Confidențialitate (NDA)",
  altul:               "Alt tip",
};

/** Tipuri de document suportate de eContracte.ro (mirror la platformă). */
export type DocumentType =
  | "contract"
  | "act_aditional"
  | "oferta"
  | "acord"
  | "proces_verbal";

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  contract:       "Contract",
  act_aditional:  "Act adițional",
  oferta:         "Ofertă",
  acord:          "Acord",
  proces_verbal:  "Proces verbal",
};

/** Template-uri pre-configurate care se auto-completează cu date companie + parte. */
export type ContractTemplate = {
  id: string;
  name: string;
  kind: ContractKind;
  documentType: DocumentType;
  description: string;
};

export const CONTRACT_TEMPLATES: ContractTemplate[] = [
  { id: "tpl_colab_curier",  name: "Colaborare curier PFA",              kind: "colaborare_curier",  documentType: "contract",      description: "Contract standard PFA / SRL curier — clauze delivery, exclusivitate opțională, plată săptămânală." },
  { id: "tpl_subcontr",      name: "Subcontractare flotă",               kind: "subcontractare",     documentType: "contract",      description: "Contract subcontractor cu comision procentual, target minim curieri activi." },
  { id: "tpl_comodat",       name: "Comodat vehicul (bicicletă/scuter)", kind: "comodat_vehicul",    documentType: "contract",      description: "Împrumut vehicul flotă către curier, cu inventar și clauze de restituire." },
  { id: "tpl_cazare",        name: "Închiriere cazare curieri",          kind: "inchiriere_cazare",  documentType: "contract",      description: "Contract închiriere cameră / apartament pentru curieri, chirie lunară incluzând utilități." },
  { id: "tpl_nda",           name: "NDA — Confidențialitate",            kind: "confidentialitate",  documentType: "acord",         description: "Acord NDA cu terți parteneri; clauze standard 24 luni." },
  { id: "tpl_act_ad",        name: "Act adițional generic",              kind: "servicii",           documentType: "act_aditional", description: "Modifică clauze din contractul-cadru: preț, durată, obiect, părți." },
  { id: "tpl_oferta_srv",    name: "Ofertă servicii delivery",           kind: "servicii",           documentType: "oferta",        description: "Ofertă comercială pentru un client B2B — număr curse / oraș / preț per livrare." },
  { id: "tpl_pv_predare",    name: "Proces verbal predare-primire",      kind: "servicii",           documentType: "proces_verbal", description: "PV pentru predarea unui vehicul, echipament sau cazare între părți." },
];

/** Fluxul de semnare cu serviciu extern (mock). */
export type SignatureStatus =
  | "draft"                 // ciornă locală, nu s-a trimis
  | "sent_for_signing"      // trimis la serviciu extern, așteaptă semnare
  | "pending_counterparty"  // semnat de noi, așteptăm cealaltă parte
  | "signed"                // ambele părți au semnat
  | "rejected"              // respins de cealaltă parte
  | "expired"               // expirat fără semnare
  | "cancelled";            // anulat manual

export const SIGNATURE_STATUS_LABEL: Record<SignatureStatus, string> = {
  draft:                 "Ciornă",
  sent_for_signing:      "Trimis la semnat",
  pending_counterparty:  "Așteaptă parte",
  signed:                "Semnat complet",
  rejected:              "Respins",
  expired:               "Expirat",
  cancelled:             "Anulat",
};

export const SIGNATURE_STATUS_STYLE: Record<SignatureStatus, string> = {
  draft:                 "bg-white/[0.06] text-fg-dim border-line",
  sent_for_signing:      "bg-sky-500/15 text-sky-300 border-sky-500/30",
  pending_counterparty:  "bg-amber-500/15 text-amber-300 border-amber-500/30",
  signed:                "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  rejected:              "bg-rose-500/15 text-rose-300 border-rose-500/30",
  expired:               "bg-white/[0.04] text-fg-dim border-line line-through",
  cancelled:             "bg-white/[0.04] text-fg-dim border-line line-through",
};

/** State-ul integrării cu serviciul extern (mock). */
export type ExternalSigningState = {
  provider: "internal" | "econtract_ro" | "docusign" | "adobe_sign";
  envelopeId: string | null;          // ID returnat de provider după upload
  signUrl: string | null;             // URL trimis contrapartidei
  sentAtIso: string | null;
  ourSignedAtIso: string | null;      // când am semnat noi
  counterSignedAtIso: string | null;  // când a semnat cealaltă parte
  lastEventIso: string | null;
  errorMessage: string | null;
};

export const EMPTY_SIGNING: ExternalSigningState = {
  provider: "internal",
  envelopeId: null,
  signUrl: null,
  sentAtIso: null,
  ourSignedAtIso: null,
  counterSignedAtIso: null,
  lastEventIso: null,
  errorMessage: null,
};

export type Contract = {
  id: string;
  tenantId: string;

  number: string;               // număr intern (ex: "COM-2026-0001")
  title: string;                // titlu descriptiv
  kind: ContractKind;
  documentType: DocumentType;   // contract | act adițional | ofertă | acord | proces verbal
  templateId: string | null;    // sursă template

  /** Partea cu care semnez. */
  partyType: ContractPartyType;
  partyName: string;
  partyEmail: string | null;
  partyPhone: string | null;
  partyCui: string | null;

  /** Legătură opțională către o entitate din CRM (curier / cazare / subcontractor). */
  linkedEntityId: string | null;

  startDateIso: string;
  endDateIso: string | null;    // null = pe durată nedeterminată

  monthlyValueRon: number | null;

  /** PDF-ul contractului (mock: nume fișier + size + data upload). */
  pdfName: string | null;
  pdfSize: number | null;
  pdfUploadedAtIso: string | null;

  status: SignatureStatus;
  signing: ExternalSigningState;

  notes: string | null;

  createdAtIso: string;
  createdBy: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;

export function todayIsoLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso + "T00:00:00Z").getTime();
  if (!Number.isFinite(t)) return null;
  return Math.round((t - Date.now()) / DAY_MS);
}
