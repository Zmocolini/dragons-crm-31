// Integrare cu servicii de semnare electronică. Focus principal: eContracte.ro (RO).
//
// eContracte.ro (https://econtracte.ro) — platformă românească de management contracte + semnare
// electronică conform eIDAS Reg. (UE) 910/2014 și Legea 214/2024. Emite contracte, acte adiționale,
// oferte, acorduri, procese verbale; părțile primesc link de semnare pe email; status real-time
// (semnat / așteaptă / respins / arhivat); audit complet.
//
// Pricing eContracte.ro (2026):
//   - Basic:   69.9  RON/lună
//   - Optim:   129.9 RON/lună
//   - Premium: 399.9 RON/lună
//   - 14 zile trial fără card.
//
// TODO(real-users): platforma nu publică API oficial. Integrarea reală se face pe una din căi:
//   1. Poll pe UI-ul lor cu contul Business (session cookie) — fragile.
//   2. Cerere API privat prin sales@econtracte.ro (obligatoriu pt. plan enterprise).
//   3. Webhook custom: platforma pushează pe URL-ul nostru la fiecare eveniment.
// Alternativ (mai deschis): DocuSign REST v2.1 sau Adobe Sign API v6.

export type SigningProvider = "internal" | "econtract_ro" | "docusign" | "adobe_sign";

export const SIGNING_PROVIDER_LABEL: Record<SigningProvider, string> = {
  internal:      "Intern (semnare manuală)",
  econtract_ro:  "eContracte.ro",
  docusign:      "DocuSign",
  adobe_sign:    "Adobe Sign",
};

export const SIGNING_PROVIDER_URL: Record<SigningProvider, string> = {
  internal:      "",
  econtract_ro:  "https://econtracte.ro",
  docusign:      "https://www.docusign.com",
  adobe_sign:    "https://www.adobe.com/sign",
};

/** Configurarea unui provider în CRM (mock — real: API key + secret salvate în vault). */
export type ProviderConfig = {
  provider: SigningProvider;
  connected: boolean;
  accountEmail: string | null;
  apiKeyMasked: string | null;   // ex: "sk_...abcd" — niciodată cheia completă în state
  plan: string | null;           // "Basic" | "Optim" | "Premium" pentru eContracte.ro
  connectedAtIso: string | null;
};

export const EMPTY_PROVIDER_CONFIG: ProviderConfig = {
  provider: "econtract_ro",
  connected: false,
  accountEmail: null,
  apiKeyMasked: null,
  plan: null,
  connectedAtIso: null,
};

export type SendEnvelopeInput = {
  provider: SigningProvider;
  contractNumber: string;
  contractTitle: string;
  documentType: "contract" | "act_aditional" | "oferta" | "acord" | "proces_verbal";
  partyName: string;
  partyEmail: string | null;
  partyCui: string | null;
  pdfName: string | null;
  pdfBase64: string | null;   // real: PDF encoded — dev: null → mock
  apiKey: string | null;      // cheia salvată în providerConfig
};

export type SendEnvelopeResult =
  | { ok: true; envelopeId: string; signUrl: string; usedRealApi: boolean }
  | { ok: false; error: string };

/** Poate încerca API-ul real? true doar pentru eContracte.ro cu toate ingredientele. */
function canUseRealApi(input: SendEnvelopeInput): boolean {
  return input.provider === "econtract_ro" && !!input.apiKey && !!input.pdfBase64;
}

/** Apel real la eContracte.ro. Returnează null când trebuie fallback la mock. */
async function trySendReal(input: SendEnvelopeInput): Promise<SendEnvelopeResult | null> {
  const { createEnvelope, isApiConfigured } = await import("./api-client");
  if (!isApiConfigured()) return null;
  const callbackUrl = typeof window !== "undefined"
    ? `${window.location.origin}/api/webhooks/econtracte`
    : undefined;
  const res = await createEnvelope(
    {
      documentType: input.documentType,
      documentNumber: input.contractNumber,
      documentTitle: input.contractTitle,
      pdfBase64: input.pdfBase64!,
      parties: [{
        name: input.partyName,
        email: input.partyEmail!,
        role: "signer",
        cui: input.partyCui ?? undefined,
      }],
      language: "ro",
      callbackUrl,
    },
    input.apiKey!,
  );
  if (res.ok) {
    return { ok: true, envelopeId: res.data.envelopeId, signUrl: res.data.signUrl, usedRealApi: true };
  }
  // Eroare reală (nu missing config) → bubble up
  if (!res.mockFallback) return { ok: false, error: res.error };
  return null;
}

/** Mock: envelope fake după 700ms. */
function sendMock(input: SendEnvelopeInput): Promise<SendEnvelopeResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const envelopeId = `${input.provider.toUpperCase()}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      const signUrl = input.provider === "internal"
        ? ""
        : `https://sign.${input.provider === "econtract_ro" ? "econtracte.ro" : input.provider.replace("_", ".")}/env/${envelopeId}`;
      resolve({ ok: true, envelopeId, signUrl, usedRealApi: false });
    }, 700);
  });
}

/**
 * Trimite plicul pentru semnare.
 * 1. Dacă e eContracte.ro + API configurat + cheie + PDF → apel real.
 * 2. Altfel → mock.
 */
export async function sendEnvelope(input: SendEnvelopeInput): Promise<SendEnvelopeResult> {
  if (!input.partyEmail && input.provider !== "internal") {
    return { ok: false, error: "Adresa de email a contrapartidei e obligatorie pentru semnare externă." };
  }
  if (canUseRealApi(input)) {
    const real = await trySendReal(input);
    if (real) return real;
  }
  return sendMock(input);
}

/** Mock: revocă semnarea (real: DELETE envelope). */
export function revokeEnvelope(_envelopeId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  return new Promise((resolve) => setTimeout(() => resolve({ ok: true }), 300));
}

/** Mock connect: în real face OAuth2 + salvează token în vault. */
export function connectProvider(input: {
  provider: SigningProvider; accountEmail: string; apiKey: string; plan?: string;
}): Promise<{ ok: true; config: ProviderConfig } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    setTimeout(() => {
      if (!input.accountEmail.includes("@") || input.apiKey.length < 8) {
        resolve({ ok: false, error: "Email invalid sau cheie API prea scurtă." });
        return;
      }
      const masked = `${input.apiKey.slice(0, 4)}…${input.apiKey.slice(-4)}`;
      resolve({
        ok: true,
        config: {
          provider: input.provider,
          connected: true,
          accountEmail: input.accountEmail,
          apiKeyMasked: masked,
          plan: input.plan ?? null,
          connectedAtIso: new Date().toISOString(),
        },
      });
    }, 500);
  });
}
