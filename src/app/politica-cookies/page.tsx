import Link from "next/link";
import { PublicFooter } from "@/components/layout/Footer";

export const metadata = { title: "Politica de Cookie-uri · Dragons CRM" };

export default function CookiePolicyPage() {
  const lastUpdated = "23 septembrie 2026";
  return (
    <>
    <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <Link href="/" className="mb-6 inline-block text-[12.5px] text-violet-300 hover:underline">← Înapoi la aplicație</Link>
      <h1 className="mb-2 text-[26px] font-bold text-fg">Politica de Cookie-uri</h1>
      <p className="mb-8 text-[12px] text-fg-muted">Ultima actualizare: {lastUpdated}</p>

      <Section title="1. Ce sunt cookie-urile?">
        Cookie-urile sunt fișiere text mici stocate în browserul dvs. atunci când vizitați un site web.
        Sunt folosite pe scară largă pentru a face site-urile să funcționeze, să funcționeze mai eficient
        și pentru a oferi informații proprietarilor site-ului.
      </Section>

      <Section title="2. Ce cookie-uri folosim">
        <p>Dragons CRM folosește <b>doar cookie-uri strict necesare</b> pentru funcționarea aplicației.
          Nu folosim cookie-uri de marketing, publicitate sau analytics terțe.</p>
        <div className="mt-4 overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-line bg-card-hover text-[11px] uppercase tracking-wider text-fg-dim">
              <tr>
                <th className="px-3 py-2">Nume</th>
                <th className="px-3 py-2">Scop</th>
                <th className="px-3 py-2">Tip</th>
                <th className="px-3 py-2">Durată</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/60 text-fg">
              <tr>
                <td className="px-3 py-2 font-mono text-[11.5px]">crm31_session</td>
                <td className="px-3 py-2">Menține sesiunea de autentificare. Fără acest cookie, aplicația nu poate ști cine sunteți.</td>
                <td className="px-3 py-2"><span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-200">Strict necesar</span></td>
                <td className="px-3 py-2">Sesiune (până la închiderea browserului)</td>
              </tr>
              <tr>
                <td className="px-3 py-2 font-mono text-[11.5px]">crm31_cookie_consent</td>
                <td className="px-3 py-2">Reține că ați văzut banner-ul de cookie-uri, ca să nu se mai afișeze.</td>
                <td className="px-3 py-2"><span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10.5px] font-semibold text-emerald-200">Strict necesar</span></td>
                <td className="px-3 py-2">1 an</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="3. Local Storage">
        Aplicația folosește <b>Local Storage</b> (o tehnologie similară cu cookie-urile) pentru:
        <ul className="mt-2 ml-5 list-disc space-y-1">
          <li>Preferințe UI (temă, sidebar deschis/închis, filtre salvate)</li>
          <li>Cache local al datelor pentru performanță (curieri, plăți)</li>
          <li>Backup automat al datelor înainte de sincronizarea cu serverul</li>
        </ul>
        Aceste date rămân în browserul dvs. și sunt șterse când goliți datele site-ului sau când
        vă delogați.
      </Section>

      <Section title="4. Cookie-uri de la terți">
        <b>Nu folosim</b> cookie-uri de la terți. Aplicația <b>nu conține</b>: Google Analytics,
        Facebook Pixel, alte instrumente de tracking, reclame externe sau widget-uri de social media.
      </Section>

      <Section title="5. Cum controlați cookie-urile">
        Puteți controla și șterge cookie-urile după cum doriți. Detalii pe <a href="https://www.aboutcookies.org/" target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:underline">aboutcookies.org</a>.
        <p className="mt-2"><b>Atenție:</b> dacă blocați cookie-ul <code className="rounded bg-card-hover px-1 text-[11.5px]">crm31_session</code>,
        <b> nu vă veți putea autentifica</b> în aplicație — este strict necesar pentru funcționare.</p>
      </Section>

      <Section title="6. Modificări la această politică">
        Ne rezervăm dreptul de a actualiza această politică. Modificările vor fi publicate pe această pagină cu data actualizării.
      </Section>

      <Section title="7. Contact">
        Pentru întrebări legate de această politică, contactați-ne la adresa de email furnizată în
        <Link href="/politica-confidentialitate" className="text-violet-300 hover:underline"> politica de confidențialitate</Link>.
      </Section>

      <div className="mt-10 flex gap-4 border-t border-line pt-6 text-[12px] text-fg-muted">
        <Link href="/politica-confidentialitate" className="hover:text-fg">Politica de Confidențialitate</Link>
        <span>·</span>
        <Link href="/termeni" className="hover:text-fg">Termeni și Condiții</Link>
      </div>
    </div>
    <PublicFooter />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 text-[16px] font-bold text-fg">{title}</h2>
      <div className="text-[13.5px] leading-relaxed text-fg-muted">{children}</div>
    </section>
  );
}
