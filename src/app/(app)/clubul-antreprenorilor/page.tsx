"use client";

import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { DragonsAllianceDivisions } from "@/components/entrepreneurs/DragonsAllianceDivisions";
import { CommunityProjects } from "@/components/entrepreneurs/CommunityProjects";

export default function ClubulAntreprenorilorPage() {
  return (
    <div className="mx-auto w-full max-w-[1520px] px-5 pt-5 pb-6 md:px-6">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Link href="/" className="inline-flex items-center gap-1 hover:text-fg">
          <Home size={12} />
          Dashboard
        </Link>
        <ChevronRight size={12} className="text-fg-dim" />
        <span className="text-fg">Clubul Antreprenorilor</span>
      </nav>

      <div className="mt-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-fg md:text-[28px]">
            Clubul Antreprenorilor
          </h1>
          <p className="mt-1 text-[13.5px] text-fg-muted">
            Aici sunt toți asociații noștri cu proiectele lor. Fiecare proiect e al unui colaborator privat.
          </p>
        </div>
      </div>

      <div className="mt-5">
        <DragonsAllianceDivisions />
        <CommunityProjects />
      </div>
    </div>
  );
}
