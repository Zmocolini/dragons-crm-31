import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/core";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

/** Culege snapshot-ul CRM ca să dea context AI-ului. */
async function buildCrmContext(userRole: string, userEmail: string): Promise<string> {
  const parts: string[] = [];

  // Users summary (doar pentru Global Owner)
  if (userRole === "global_owner") {
    const users = await db.select({
      name: schema.users.name, email: schema.users.email, role: schema.users.role, active: schema.users.active,
    }).from(schema.users).limit(50);
    parts.push(`UTILIZATORI CRM (${users.length}):\n${users.map((u) => `- ${u.name} (${u.email}) rol=${u.role} activ=${u.active}`).join("\n")}`);
  } else {
    parts.push(`UTILIZATOR CURENT: ${userEmail} (rol=${userRole}, subcontractor)`);
  }

  // Duplicate pairs (cont dublu)
  const dupPairs = await db.select().from(schema.duplicatePairs).limit(30);
  if (dupPairs.length > 0) {
    parts.push(`PERECHI CONT DUBLU (${dupPairs.length}): ${dupPairs.map((p) => `curieri #${p.courierAId}↔#${p.courierBId} feeOnce=${p.feeOnce} commPct=${p.commissionPct}`).join("; ")}`);
  }

  // Tickets summary
  const tickets = await db.select({
    id: schema.tickets.id, subject: schema.tickets.subject, category: schema.tickets.category,
    priority: schema.tickets.priority, status: schema.tickets.status, createdBy: schema.tickets.createdByEmail,
  }).from(schema.tickets).orderBy(desc(schema.tickets.createdAtIso)).limit(20);
  if (tickets.length > 0) {
    // Filtru pentru subcontractor
    const visible = userRole === "global_owner" ? tickets : tickets.filter((t) => t.createdBy === userEmail);
    parts.push(`TICHETE SUPORT (${visible.length}):\n${visible.map((t) => `- [${t.status}] ${t.priority} "${t.subject}" (${t.category}) de la ${t.createdBy}`).join("\n")}`);
  }

  // Curieri și plăți sunt în localStorage (client-side) — nu le văd server-side.
  // AI-ul primește doar contextul server-side; user-ul poate copia liste din UI dacă e nevoie.
  parts.push("NOTĂ: Datele despre curieri și plăți sunt în localStorage-ul browser-ului; nu am acces direct la ele server-side. Utilizatorul poate cere să genereze rapoarte din CRM.");

  return parts.join("\n\n");
}

const SYSTEM_PROMPT_TEMPLATE = `Ești AI Copilot pentru Dragons CRM — un sistem de management flotă curieri (Bolt, Wolt, Glovo).
Vorbești română, ești concis și util. Răspunzi ca un asistent inteligent, nu ca un chatbot generic.

Roluri în sistem:
- Global Owner: acces total, vede toate flotele + toți subcontractorii + toate tichetele
- Subcontractor: vede doar datele lui (curierii pe care i-a adăugat, plățile lui, tichetele lui)

Ce știi despre CRM:
- Import Excel de la Bolt/TTG, Gusty (Bolt/Wolt/Glovo) pentru plăți
- Modul "Cont dublu" permite unirea a 2 conturi (aceeași persoană, platforme diferite) — taxa și comisionul se aplică o singură dată
- Ticket system pentru probleme/suport centralizat (Global Owner vede toate)
- Filtrare per subcontractor: fiecare vede doar datele lui
- Backup automat + auto-restore la Turso cloud

CONTEXT CURENT (LIVE din bază de date):
{{CRM_CONTEXT}}

Reguli:
- Răspunde scurt și direct. Fără preambul lung.
- Dacă întrebarea cere date pe care nu le ai (ex: liste curieri), spune că poți ghida user-ul unde să caute în CRM.
- Formatare cu bullets scurte când e util. Numere în bold cu **text**.
- Pentru sfaturi/analize: dă maxim 3 puncte concrete, acționabile.`;

export async function POST(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  if (messages.length === 0) return NextResponse.json({ error: "no messages" }, { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY nu e setată în env vars (Vercel Settings → Environment Variables)" }, { status: 503 });
  }

  const crmContext = await buildCrmContext(user.role, user.email);
  const systemPrompt = SYSTEM_PROMPT_TEMPLATE.replace("{{CRM_CONTEXT}}", crmContext);

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: { role: string; content: string }) => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: `Groq API: ${res.status} ${errText.slice(0, 200)}` }, { status: 500 });
    }
    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? "Fără răspuns.";
    return NextResponse.json({ reply, model: data.model, usage: data.usage });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).message ?? e) }, { status: 500 });
  }
}
