import Link from "next/link";
import { PublicFooter } from "@/components/layout/Footer";

export const metadata = { title: "Termeni și Condiții · Dragons CRM" };

export default function TermsPage() {
  const lastUpdated = "23 septembrie 2026";
  return (
    <>
    <div className="mx-auto max-w-3xl px-4 py-8 lg:py-12">
      <Link href="/" className="mb-6 inline-block text-[12.5px] text-violet-300 hover:underline">← Înapoi la aplicație</Link>
      <h1 className="mb-2 text-[26px] font-bold text-fg">Termeni și Condiții</h1>
      <p className="mb-8 text-[12px] text-fg-muted">Ultima actualizare: {lastUpdated}</p>

      <Section title="1. Acceptarea termenilor">
        <p>
          Prin accesarea și utilizarea Dragons CRM („Aplicația"), acceptați integral acești Termeni și
          Condiții. Dacă nu sunteți de acord, nu utilizați Aplicația.
        </p>
        <p className="mt-2">
          Aceștia formează un contract obligatoriu între dvs. („Utilizator") și Dragons Delivery
          („Operator"), guvernat de <b>legea română</b>.
        </p>
      </Section>

      <Section title="2. Descrierea serviciului">
        Dragons CRM este o aplicație web internă pentru administrarea unei flote de curieri, care
        include:
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li>Evidența curierilor, subcontractorilor și candidaților</li>
          <li>Gestiunea documentelor și pozelor curierilor</li>
          <li>Import și calcul automat plăți din Bolt, Wolt, Glovo (TTG / Gusty)</li>
          <li>Rapoarte, dashboard-uri, activări, cazări, contracte</li>
          <li>Facturi și contabilitate primară</li>
        </ul>
      </Section>

      <Section title="3. Conturi și autentificare">
        <ul className="ml-5 list-disc space-y-1">
          <li>Aveți nevoie de un cont valid pentru a accesa Aplicația</li>
          <li>Sunteți responsabil de confidențialitatea parolei</li>
          <li>Notificați imediat Operatorul la orice acces neautorizat</li>
          <li>Un cont Global Owner este creat prin flow-ul de înregistrare</li>
          <li>Conturi secundare pot fi create doar de Global Owner sau Manager</li>
        </ul>
      </Section>

      <Section title="4. Utilizare acceptabilă">
        Vă angajați să:
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li>Folosiți Aplicația <b>doar în scopuri legale</b> și în conformitate cu acești Termeni</li>
          <li>Introduceți date exacte și actualizate despre curieri și plăți</li>
          <li>Nu încercați accesul neautorizat la conturi sau date ale altor utilizatori</li>
          <li>Nu efectuați activități care afectează integritatea sau performanța Aplicației</li>
          <li>Respectați GDPR când introduceți date personale ale curierilor</li>
          <li>Obțineți consimțământul curierilor pentru încărcarea documentelor scanate</li>
        </ul>
      </Section>

      <Section title="5. Drepturi de proprietate intelectuală">
        <p>
          Codul sursă, designul, logo-ul și marca „Dragons CRM" sunt proprietatea Operatorului.
          Utilizatorii nu au dreptul să copieze, modifice, distribuie sau exploateze Aplicația fără
          acord scris.
        </p>
        <p className="mt-2">
          Datele introduse de dvs. (curieri, plăți, documente) <b>rămân proprietatea dvs.</b>
          Operatorul le procesează ca împuternicit GDPR pentru livrarea serviciului.
        </p>
      </Section>

      <Section title="6. Plăți și abonament">
        Dragons CRM este oferit în modul curent <b>fără cost pentru utilizatorul intern</b>.
        Modificările viitoare privind prețul vor fi comunicate cu minim 30 zile în avans.
      </Section>

      <Section title="7. Disponibilitatea serviciului">
        <ul className="ml-5 list-disc space-y-1">
          <li>Ne străduim să menținem uptime <b>≥ 99%</b> (excluzând mentenanță planificată)</li>
          <li>Mentenanța planificată va fi anunțată în avans</li>
          <li>Serviciul este furnizat „așa cum este" — fără garanție de disponibilitate 100%</li>
        </ul>
      </Section>

      <Section title="8. Backup și recuperare date">
        <ul className="ml-5 list-disc space-y-1">
          <li>Backup automat rulează la fiecare modificare (ultimele 50 versiuni)</li>
          <li>Datele sunt criptate în tranzit (HTTPS) și la repaus</li>
          <li>Restaurarea automată se face din ultimul backup „bun" dacă localStorage-ul se golește</li>
          <li>Recomandăm export manual JSON lunar pentru arhivă independentă</li>
        </ul>
      </Section>

      <Section title="9. Limitarea răspunderii">
        <p>
          Operatorul <b>nu răspunde</b> pentru:
        </p>
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li>Pierderi financiare rezultate din date introduse greșit de utilizator</li>
          <li>Întreruperi cauzate de furnizori terți (Turso, Cloudflare, Vercel)</li>
          <li>Pierderi cauzate de acces neautorizat rezultat din parolă compromisă</li>
          <li>Pierdere de date cauzată de ștergere manuală de către utilizator</li>
        </ul>
        <p className="mt-2">
          Răspunderea totală a Operatorului este limitată la valoarea abonamentului plătit în ultimele
          12 luni (dacă există).
        </p>
      </Section>

      <Section title="10. Suspendarea și încetarea contului">
        Operatorul poate suspenda sau șterge conturi care:
        <ul className="ml-5 mt-2 list-disc space-y-1">
          <li>Încalcă acești Termeni</li>
          <li>Folosesc Aplicația în scopuri ilegale</li>
          <li>Compromit securitatea sau performanța sistemului</li>
        </ul>
        <p className="mt-2">
          La încetarea contului, datele vor fi păstrate conform politicii de retenție din
          <Link href="/politica-confidentialitate" className="text-violet-300 hover:underline"> Politica de Confidențialitate</Link>.
        </p>
      </Section>

      <Section title="11. Modificări">
        Ne rezervăm dreptul de a modifica acești Termeni. Modificările vor fi publicate pe această
        pagină cu data actualizării. Continuarea utilizării după modificări echivalează cu acceptarea
        noilor termeni.
      </Section>

      <Section title="12. Legea aplicabilă și jurisdicție">
        Acest contract este guvernat de <b>legea română</b>. Orice litigiu va fi rezolvat de instanțele
        competente din <b>București, România</b>.
      </Section>

      <Section title="13. Contact">
        Pentru întrebări legate de acești Termeni, contactați Operatorul la adresa de email a
        titularului contului Global Owner al flotei dvs.
      </Section>

      <div className="mt-10 flex gap-4 border-t border-line pt-6 text-[12px] text-fg-muted">
        <Link href="/politica-cookies" className="hover:text-fg">Politica de Cookie-uri</Link>
        <span>·</span>
        <Link href="/politica-confidentialitate" className="hover:text-fg">Politica de Confidențialitate</Link>
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
