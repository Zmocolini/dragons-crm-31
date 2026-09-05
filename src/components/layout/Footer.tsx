import { currentYear } from "@/lib/utils/date";

export function Footer() {
  return (
    <footer className="mt-6 flex flex-col gap-2 border-t border-line/70 px-6 py-4 text-[11.5px] text-fg-dim md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2">
        <span className="font-semibold text-fg-muted">
          Dragon Delivery CRM v3.1.0
        </span>
        <span className="text-fg-dim/60">|</span>
        <span>Performanță. Oameni. Creștere.</span>
      </div>
      <div>© {currentYear()} Dragon Delivery. Toate drepturile rezervate.</div>
    </footer>
  );
}
