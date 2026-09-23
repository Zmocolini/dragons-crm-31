import Link from "next/link";
import { currentYear } from "@/lib/utils/date";

export function Footer() {
  return (
    <footer className="mt-6 flex flex-col gap-2 border-t border-line/70 px-6 py-4 text-[11.5px] text-fg-dim md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-fg-muted">
          Dragons Delivery CRM v3.1.0
        </span>
        <span className="text-fg-dim/60">|</span>
        <span>Performanță. Oameni. Creștere.</span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Link href="/politica-cookies" className="hover:text-fg">Cookie-uri</Link>
        <span className="text-fg-dim/60">·</span>
        <Link href="/politica-confidentialitate" className="hover:text-fg">Confidențialitate</Link>
        <span className="text-fg-dim/60">·</span>
        <Link href="/termeni" className="hover:text-fg">Termeni</Link>
        <span className="text-fg-dim/60">|</span>
        <span>© {currentYear()} Dragons Delivery. Toate drepturile rezervate.</span>
      </div>
    </footer>
  );
}

/** Variantă compactă pentru paginile publice (login/register/politici). */
export function PublicFooter() {
  return (
    <footer className="border-t border-line/60 bg-app/40 px-4 py-4 text-center text-[11px] text-fg-dim">
      <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <span>© {currentYear()} <span className="font-semibold text-fg-muted">Dragons Delivery</span>. Toate drepturile rezervate.</span>
        <span className="text-fg-dim/60">·</span>
        <Link href="/politica-cookies" className="hover:text-fg">Cookie-uri</Link>
        <span className="text-fg-dim/60">·</span>
        <Link href="/politica-confidentialitate" className="hover:text-fg">Confidențialitate</Link>
        <span className="text-fg-dim/60">·</span>
        <Link href="/termeni" className="hover:text-fg">Termeni</Link>
      </div>
    </footer>
  );
}
