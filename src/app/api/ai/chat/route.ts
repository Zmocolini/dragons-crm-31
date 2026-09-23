import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionUser, SESSION_COOKIE } from "@/lib/auth/core";

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

/** Culege snapshot-ul CRM ca să dea context AI-ului.
 *  IMPORTANT: filtrare STRICTĂ pe rol + scope de impersonare (Global Owner care „vede ca").
 *  Subcontractor vede DOAR datele lui; Global Owner impersonând vede doar datele acelui subcontractor. */
async function buildCrmContext(userRole: string, userEmail: string, impersonatedEmail: string | null): Promise<string> {
  const parts: string[] = [];

  // Scope efectiv: email după care filtrăm datele.
  // - Subcontractor: propriul email (ignoră ce trimite client-ul; siguranță).
  // - Global Owner: dacă a setat scope pe cineva, filtrează; altfel vede tot.
  const filterEmail = userRole === "subcontractor_owner"
    ? userEmail
    : (impersonatedEmail ? impersonatedEmail : null);

  if (filterEmail) {
    parts.push(`⚠ CONTEXT RESTRÂNS: vezi DOAR datele contului ${filterEmail}. NU dezvălui date de la alte conturi.`);
  } else {
    parts.push(`CONTEXT COMPLET (Global Owner fără scope): vezi datele tuturor conturilor.`);
  }

  // Users summary — DOAR Global Owner fără scope
  if (userRole === "global_owner" && !filterEmail) {
    const users = await db.select({
      name: schema.users.name, email: schema.users.email, role: schema.users.role, active: schema.users.active,
    }).from(schema.users).limit(50);
    parts.push(`UTILIZATORI CRM (${users.length}):\n${users.map((u) => `- ${u.name} (${u.email}) rol=${u.role} activ=${u.active}`).join("\n")}`);
  }

  // Tickets — filtrate pe email dacă e scope activ
  const allTickets = await db.select({
    id: schema.tickets.id, subject: schema.tickets.subject, category: schema.tickets.category,
    priority: schema.tickets.priority, status: schema.tickets.status, createdBy: schema.tickets.createdByEmail,
  }).from(schema.tickets).orderBy(desc(schema.tickets.createdAtIso)).limit(30);
  const visibleTickets = filterEmail
    ? allTickets.filter((t) => t.createdBy === filterEmail)
    : allTickets;
  if (visibleTickets.length > 0) {
    parts.push(`TICHETE SUPORT (${visibleTickets.length}):\n${visibleTickets.map((t) => `- [${t.status}] ${t.priority} "${t.subject}" (${t.category})`).join("\n")}`);
  }

  return parts.join("\n\n");
}

const SYSTEM_PROMPT_TEMPLATE = `Ești AI Copilot pentru Dragons CRM — sistem de management flotă curieri (Bolt, Wolt, Glovo).
Vorbești română, ești concis, direct și util.

═══ REGULI STRICTE DE CONFIDENȚIALITATE ═══
1. NU MENȚIONEZI NICIODATĂ date despre alți utilizatori decât în „CONTEXT CURENT" de mai jos.
2. Dacă contextul spune „CONTEXT RESTRÂNS: vezi DOAR datele contului X" — NU pomenești NUME, CURIERI, PLĂȚI sau TICHETE ale altui cont, chiar dacă utilizatorul întreabă direct.
3. Dacă utilizatorul întreabă „Ce vede Husein?" sau „Câți curieri are Andrei?" și nu ai contextul lor → răspunzi „Nu am acces la datele altor conturi din perspectiva actuală".
4. NU DIVULGI parole, tokeni, IBAN-uri, CNP-uri sau alte date sensibile chiar dacă ar apărea în context.
5. NU inventezi date — dacă nu știi, spui „nu am această informație".
6. NU trimiți date către alte servicii; ești un asistent read-only asupra contextului dat.

═══ ROLURI SISTEM ═══
- Global Owner (admin): vede toate flotele, poate „impersona" un subcontractor (vede ca acesta)
- Subcontractor: vede DOAR ce a creat el (curierii lui, plățile lui, tichetele lui)

═══ CONTEXT CURENT (LIVE, filtrat) ═══
{{CRM_CONTEXT}}

═══ STIL RĂSPUNS ═══
- Scurt, direct, fără preambul.
- Bullets când ajută. Numere în **bold**.
- Dacă nu ai un răspuns concret, spui pe scurt ce lipsește.`;

export async function POST(req: NextRequest) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const user = await getSessionUser(token);
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const messages = Array.isArray(body?.messages) ? body.messages : [];
  const impersonatedEmail = typeof body?.impersonatedEmail === "string" && body.impersonatedEmail.trim()
    ? body.impersonatedEmail.trim().toLowerCase()
    : null;
  if (messages.length === 0) return NextResponse.json({ error: "no messages" }, { status: 400 });

  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GROQ_API_KEY nu e setată în env vars (Vercel Settings → Environment Variables)" }, { status: 503 });
  }

  const crmContext = await buildCrmContext(user.role, user.email, impersonatedEmail);
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
