import "server-only";
import nodemailer from "nodemailer";

/** Gmail SMTP (GMAIL_USER + GMAIL_APP_PASSWORD = parolă de aplicație) are prioritate; Resend (RESEND_API_KEY + MAIL_FROM) e rezerva.
 *  Fără niciuna nu trimite — apelantul afișează linkul de copiat. */
const gmailConfigured = () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
export function mailConfigured(): boolean {
  return gmailConfigured() || !!(process.env.RESEND_API_KEY && process.env.MAIL_FROM);
}

export async function sendMail(p: { to: string; subject: string; html: string; text: string }): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!mailConfigured()) return { ok: false, error: "Email neconfigurat (lipsesc GMAIL_USER / GMAIL_APP_PASSWORD)." };
  if (gmailConfigured()) {
    try {
      const user = process.env.GMAIL_USER!;
      const t = nodemailer.createTransport({ service: "gmail", auth: { user, pass: process.env.GMAIL_APP_PASSWORD!.replace(/\s/g, "") } });
      await t.sendMail({ from: `Dragon Delivery CRM <${user}>`, to: p.to, subject: p.subject, html: p.html, text: p.text });
      return { ok: true };
    } catch (e) {
      return { ok: false, error: `Gmail a refuzat trimiterea (${(e as { responseCode?: number }).responseCode ?? "conexiune"}). Verifică parola de aplicație.` };
    }
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.MAIL_FROM, to: [p.to], subject: p.subject, html: p.html, text: p.text }),
    });
    if (!res.ok) return { ok: false, error: `Furnizorul de email a răspuns ${res.status}.` };
    return { ok: true };
  } catch {
    return { ok: false, error: "Nu am putut contacta furnizorul de email." };
  }
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

export function inviteEmail(p: { name: string; link: string; days: number; inviter: string }) {
  const hello = p.name ? `Salut, ${p.name}!` : "Salut!";
  const text = `${hello}\n\n${p.inviter} te-a invitat în Dragon Delivery CRM ca subcontractor.\nCreează-ți contul (link valabil ${p.days} zile, de unică folosință):\n${p.link}\n\nDacă nu te așteptai la acest mesaj, ignoră-l.`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:24px;color:#111">
<h2 style="margin:0 0 12px">Invitație în Dragon Delivery CRM</h2>
<p>${esc(hello)}</p>
<p>${esc(p.inviter)} te-a invitat în CRM ca subcontractor. Apasă pe buton ca să-ți creezi contul și să-ți alegi parola.</p>
<p style="margin:24px 0"><a href="${esc(p.link)}" style="background:#6d28d9;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Creează contul</a></p>
<p style="font-size:12px;color:#555">Linkul e valabil ${p.days} zile și poate fi folosit o singură dată.<br>Dacă butonul nu merge, copiază adresa: ${esc(p.link)}</p>
<p style="font-size:12px;color:#555">Dacă nu te așteptai la acest mesaj, ignoră-l.</p></div>`;
  return { subject: "Invitație în Dragon Delivery CRM", html, text };
}
