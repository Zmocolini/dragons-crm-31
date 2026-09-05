import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export function ProfileBreadcrumb() {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-fg-muted">
      <Link href="/" className="inline-flex items-center gap-1 hover:text-fg">
        <Home size={12} />
        Dashboard
      </Link>
      <ChevronRight size={12} className="text-fg-dim" />
      <span className="text-fg">Profilul meu</span>
    </nav>
  );
}
