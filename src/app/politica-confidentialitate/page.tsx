import Link from "next/link";
import { PublicFooter } from "@/components/layout/Footer";

export const metadata = { title: "Politica de Confidențialitate · Dragons CRM" };

export default function PrivacyPolicyPage() {
  const lastUpdated = "23 septembrie 2026";
  return (
    <>
    <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <Link href="/" className="mb-6 inline-block text-[12.5px] text-violet-300 hover:underline">← Înapoi la aplicație</Link>
      <h1 className="mb-2 text-[26px] font-bold text-fg">Politica de Confidențialitate</h1>
      <p className="mb-8 text-[12px] text-fg-muted">Ultima actualizare: {lastUpdated}</p>

      <Section title="1. Operatorul datelor">
        <p>
          Dragons Delivery („Operatorul") gestionează Dragons CRM, o aplicație internă folosită pentru
          administrarea flotei de curieri, plăților, documentelor și rapoartelor. Această politică
          descrie cum sunt colectate, folosite și protejate datele personale în conformitate cu
          <b> Regulamentul (UE) 2016/679 (GDPR)</b>.
        </p>
        <p className="mt-2">
          <b>Date de contact:</b> pentru orice solicitare privind datele personale, ne puteți contacta la
          adresa de email a titularului contului de administrator din CRM.
        </p>
      </Section>

      <Section title="2. Ce date colectăm">
        <div className="mb-3">
          <div className="font-bold text-fg">A. Date despre utilizatorii CRM-ului (voi, angajați)</div>
          <ul className="ml-5 mt-1 list-disc space-y-1">
            <li>Nume și prenume</li>
            <li>Adresa de email (pentru autentificare)</li>
            <li>Parola (stocată criptată cu bcrypt, nu în text clar)</li>
            <li>Rolul în aplicație (owner, manager, etc.)</li>
            <li>Timestamp-uri: creare cont, ultima autentificare</li>
          </ul>
        </div>
        <div className="mb-3">
          <div className="font-bold text-fg">B. Date despre curieri (personal externe/subcontractori)</div>
          <ul className="ml-5 mt-1 list-disc space-y-1">
            <li>Nume complet, telefon, email (opțional), oraș, naționalitate</li>
            <li>Platforme pe care lucrează (Bolt, Wolt, Glovo)</li>
            <li>UID-uri specifice platformelor (ex: Bolt UID)</li>
            <li>IBAN pentru plăți</li>
            <li>Tip vehicul și mod de colaborare (PFA, SRL, etc.)</li>
            <li>Documente încărcate: CI, permis, contract, certificat medical, asigurare, poze</li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-fg">C. Date despre plăți</div>
          <ul className="ml-5 mt-1 list-disc space-y-1">
            <li>Sume brute, comisioane, deduceri, valoare netă</li>
            <li>Perioada de plată, status, referință</li>
            <li>Metoda de plată</li>
          </ul>
        </div>
      </Section>

      <Section title="3. Baza legală și scopul prelucrării">
        <div className="overflow-x-auto rounded-lg border border-line">
          <table className="w-full text-left text-[12.5px]">
            <thead className="border-b border-line bg-card-hover text-[11px] uppercase tracking-wider text-fg-dim">
              <tr><th className="px-3 py-2">Scop</th><th className="px-3 py-2">Bază legală</th></tr>
            </thead>
            <tbody className="divide-y divide-line/60 text-fg">
              <tr><td className="px-3 py-2">Autentificare utilizatori CRM</td><td className="px-3 py-2">Contract (art. 6(1)(b))</td></tr>
              <tr><td className="px-3 py-2">Gestiunea curierilor și plăților</td><td className="px-3 py-2">Contract + Interes legitim (art. 6(1)(b)(f))</td></tr>
              <tr><td className="px-3 py-2">Emiterea documentelor fiscale</td><td className="px-3 py-2">Obligație legală (art. 6(1)(c))</td></tr>
              <tr><td className="px-3 py-2">Stocare documente scanate</td><td className="px-3 py-2">Consimțământ curier (art. 6(1)(a)) + Contract</td></tr>
              <tr><td className="px-3 py-2">Backup și securitate</td><td className="px-3 py-2">Interes legitim (art. 6(1)(f))</td></tr>
            </tbody>
          </table>
        </div>
      </Section>

      <Section title="4. Unde sunt stocate datele">
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Baza de date principală:</b> Turso (SQLite serverless), server în AWS US-East-1</li>
          <li><b>Fișiere (documente, poze):</b> Cloudflare R2, replicat pe 3 continente</li>
          <li><b>Backup automat:</b> snapshot-uri text în Turso (ultimele 50 versiuni)</li>
          <li><b>Cache local:</b> în browser-ul dvs. (Local Storage), pentru performanță</li>
        </ul>
        <p className="mt-2">
          Turso (Chiselstrike Inc.) și Cloudflare Inc. sunt împuterniciți GDPR, având Data Processing
          Agreement standard cu Standard Contractual Clauses (SCC) pentru transferuri în afara EEA.
        </p>
      </Section>

      <Section title="5. Perioada de păstrare">
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Date curieri activi:</b> pe durata colaborării + 5 ani (contabilitate)</li>
          <li><b>Plăți:</b> 10 ani (Legea 82/1991 privind contabilitatea)</li>
          <li><b>Documente scanate:</b> pe durata contractului + 3 ani</li>
          <li><b>Log-uri autentificare:</b> 12 luni</li>
          <li><b>Backup-uri automate:</b> 50 versiuni rotative</li>
        </ul>
      </Section>

      <Section title="6. Drepturile persoanelor vizate">
        Conform GDPR, aveți dreptul la:
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li><b>Acces</b> la datele personale (art. 15)</li>
          <li><b>Rectificare</b> a datelor inexacte (art. 16)</li>
          <li><b>Ștergere</b> („dreptul de a fi uitat") — art. 17</li>
          <li><b>Restricționare</b> a prelucrării (art. 18)</li>
          <li><b>Portabilitate</b> — export JSON al datelor (art. 20)</li>
          <li><b>Opoziție</b> la prelucrarea bazată pe interes legitim (art. 21)</li>
          <li><b>Retragere consimțământ</b> oricând, dacă baza este consimțământul (art. 7)</li>
          <li><b>Plângere</b> la Autoritatea Națională de Supraveghere (<a href="https://www.dataprotection.ro" target="_blank" rel="noopener noreferrer" className="text-violet-300 hover:underline">ANSPDCP</a>)</li>
        </ul>
        <p className="mt-2">Termen de răspuns la cereri: <b>maxim 30 zile</b> de la primire.</p>
      </Section>

      <Section title="7. Securitatea datelor">
        <ul className="ml-5 list-disc space-y-1">
          <li>Parolele sunt hash-uite cu <b>bcrypt</b> (10 rounds) — imposibil de recuperat în clar</li>
          <li>Sesiunile folosesc cookie-uri httpOnly + SameSite=Lax</li>
          <li>Comunicare exclusiv <b>HTTPS/TLS 1.3</b></li>
          <li>Backup automat criptat la fiecare modificare</li>
          <li>Acces la CRM restricționat pe roluri (RBAC)</li>
          <li>Log-uri de audit pentru acțiuni sensibile (plăți, ștergeri)</li>
        </ul>
      </Section>

      <Section title="8. Cine are acces la date">
        <ul className="ml-5 list-disc space-y-1">
          <li><b>Voi (Operatorul)</b> și utilizatorii pe care îi invitați în CRM</li>
          <li><b>Împuterniciți GDPR:</b> Turso (stocare DB), Cloudflare R2 (stocare fișiere), Vercel (hosting)</li>
          <li><b>Autorități</b> — la solicitare legală (ANAF, DGF, Instanțe)</li>
        </ul>
        <p className="mt-2">
          <b>NU vindem, NU închiriem, NU împărtășim</b> date cu terți în scopuri comerciale sau publicitate.
        </p>
      </Section>

      <Section title="9. Transferuri internaționale">
        Datele stocate în Turso (AWS US-East-1) și Cloudflare R2 (rețea globală) implică transferuri
        în SUA. Aceste transferuri sunt protejate prin <b>Standard Contractual Clauses (SCC)</b>
        adoptate de Comisia Europeană, plus mecanisme suplimentare de criptare la repaus și în tranzit.
      </Section>

      <Section title="10. Modificări">
        Vom actualiza această politică periodic. Modificările vor fi publicate pe această pagină cu
        data actualizării. Modificările substanțiale vor fi notificate prin email.
      </Section>

      <div className="mt-10 flex gap-4 border-t border-line pt-6 text-[12px] text-fg-muted">
        <Link href="/politica-cookies" className="hover:text-fg">Politica de Cookie-uri</Link>
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
