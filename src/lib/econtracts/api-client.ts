// Client HTTP real pentru eContracte.ro.
//
// Când vei primi API-ul de la sales@econtracte.ro, ai două opțiuni:
//   A) Setează env vars (recomandat pentru producție):
//        NEXT_PUBLIC_ECONTRACTE_BASE_URL=https://api.econtracte.ro/v1
//        ECONTRACTE_API_KEY=sk_live_xxx    (server-side only)
//   B) Salvează cheia direct în UI (dev/testing) — folosită de connectProvider().
//
// Dacă base URL lipsește sau cheia nu e setată, `apiCall()` întoarce { ok: false, mockFallback: true }
// și codul apelant folosește mock-ul din service.ts. Zero cod modificat între dev și producție.

const BASE_URL = process.env.NEXT_PUBLIC_ECONTRACTE_BASE_URL ?? "";

/**
 * Endpoints pe care le așteptăm de la eContracte.ro după cererea API.
 * TODO(real-users): înlocuiește path-urile cu cele din docs-ul primit oficial.
 */
export const ENDPOINTS = {
  /** POST — încarcă PDF-ul + metadata, primești envelopeId + signUrl */
  createEnvelope: "/envelopes",
  /** GET  — status curent al plicului (semnat / așteaptă / respins) */
  getEnvelopeStatus: (id: string) => `/envelopes/${id}`,
  /** DELETE — revocă plicul (dacă nu s-a semnat încă) */
  revokeEnvelope: (id: string) => `/envelopes/${id}`,
  /** GET — descarcă PDF-ul semnat + certificate */
  downloadSignedPdf: (id: string) => `/envelopes/${id}/signed.pdf`,
  /** GET — audit trail complet pentru semnare */
  getAuditTrail: (id: string) => `/envelopes/${id}/audit`,
} as const;

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; status?: number; mockFallback: boolean };

type ApiOpts = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  apiKey: string;
};

/**
 * Wrapper generic. Dacă BASE_URL e gol → mockFallback:true, apelantul folosește mock-ul.
 * Toate erorile de rețea sunt capturate și transformate în ApiResult.
 */
export async function apiCall<T>(path: string, opts: ApiOpts): Promise<ApiResult<T>> {
  if (!BASE_URL) {
    return { ok: false, error: "API base URL nu e configurat (NEXT_PUBLIC_ECONTRACTE_BASE_URL).", mockFallback: true };
  }
  if (!opts.apiKey) {
    return { ok: false, error: "Cheia API lipsește.", mockFallback: true };
  }
  try {
    const res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "Authorization": `Bearer ${opts.apiKey}`,
      },
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, error: `HTTP ${res.status}: ${text || res.statusText}`, status: res.status, mockFallback: false };
    }
    const data = (await res.json()) as T;
    return { ok: true, data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Network: ${msg}`, mockFallback: false };
  }
}

/** Verifică dacă avem un base URL configurat. */
export function isApiConfigured(): boolean {
  return BASE_URL.length > 0;
}

// ── Wrappers tipați pentru fiecare endpoint ──────────────────────────────────

export type CreateEnvelopeRequest = {
  documentType: "contract" | "act_aditional" | "oferta" | "acord" | "proces_verbal";
  documentNumber: string;
  documentTitle: string;
  pdfBase64: string;                // PDF-ul contractului encoded base64
  parties: Array<{
    name: string;
    email: string;
    role: "signer" | "cc";
    cui?: string;
  }>;
  language?: "ro" | "en";
  callbackUrl?: string;             // webhook-ul nostru pentru status update
};

export type CreateEnvelopeResponse = {
  envelopeId: string;
  signUrl: string;
  status: "created" | "sent";
  createdAt: string;
};

export function createEnvelope(req: CreateEnvelopeRequest, apiKey: string) {
  return apiCall<CreateEnvelopeResponse>(ENDPOINTS.createEnvelope, {
    method: "POST",
    body: req,
    apiKey,
  });
}

export type EnvelopeStatus = {
  envelopeId: string;
  status: "created" | "sent" | "viewed" | "signed" | "rejected" | "expired" | "revoked";
  parties: Array<{
    email: string;
    status: "pending" | "viewed" | "signed" | "rejected";
    signedAt: string | null;
  }>;
  signedAt: string | null;
  auditUrl: string | null;
};

export function getEnvelopeStatus(envelopeId: string, apiKey: string) {
  return apiCall<EnvelopeStatus>(ENDPOINTS.getEnvelopeStatus(envelopeId), { apiKey });
}

export function revokeEnvelopeReal(envelopeId: string, apiKey: string) {
  return apiCall<{ ok: true }>(ENDPOINTS.revokeEnvelope(envelopeId), { method: "DELETE", apiKey });
}
