import { NextResponse } from "next/server";

// Webhook receiver pentru eContracte.ro (POST din platforma lor).
//
// URL callback pe care îl trimitem la createEnvelope():
//   https://<domeniul-tău>/api/webhooks/econtracte
//
// Body așteptat (după docs primite oficial):
//   {
//     "event": "envelope.viewed" | "envelope.signed" | "envelope.rejected" | "envelope.expired",
//     "envelopeId": "ENV-...",
//     "signedAt": "2026-01-01T12:34:56Z",     // pt. signed
//     "rejectedReason": "...",                // pt. rejected
//     "signature": "hmac-sha256=..."          // header separat pentru autenticitate
//   }
//
// TODO(real-users):
//  1. Verifică semnătura HMAC cu ECONTRACTE_WEBHOOK_SECRET înainte de a trata payload-ul.
//  2. Persistă evenimentul într-o tabelă `contract_events` cu envelopeId + event + payload.
//  3. Notifică user-ul (in-app notification / email) când status-ul se schimbă în signed / rejected.
//  4. Actualizează contractul în DB (când migrezi de la localStorage la Postgres/Drizzle).

type WebhookPayload = {
  event: "envelope.viewed" | "envelope.signed" | "envelope.rejected" | "envelope.expired" | "envelope.revoked";
  envelopeId: string;
  signedAt?: string;
  rejectedReason?: string;
  signerEmail?: string;
};

function verifySignature(_rawBody: string, _signature: string | null): boolean {
  // TODO(real-users): const secret = process.env.ECONTRACTE_WEBHOOK_SECRET;
  //  if (!secret || !signature) return false;
  //  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  //  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(`hmac-sha256=${expected}`));
  return true;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-econtracte-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  let payload: WebhookPayload;
  try {
    payload = JSON.parse(rawBody) as WebhookPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.envelopeId || !payload.event) {
    return NextResponse.json({ ok: false, error: "Missing envelopeId or event" }, { status: 400 });
  }

  // TODO(real-users): găsește contractul cu signing.envelopeId === payload.envelopeId
  // și actualizează status-ul în DB. Momentan doar logăm.
  console.log("[eContracte webhook]", payload.event, payload.envelopeId);

  return NextResponse.json({ ok: true });
}

// GET pentru health-check din UI-ul eContracte.ro când setezi webhook-ul.
export async function GET() {
  return NextResponse.json({ ok: true, service: "econtracte-webhook", version: 1 });
}
