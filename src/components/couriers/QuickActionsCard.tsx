"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronRight, Download, Upload } from "lucide-react";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/Card";
import { useSession } from "@/lib/rbac/session";

type Action = {
  key: "import" | "export";
  label: string;
  icon: LucideIcon;
  onClick: () => void;
};

type Props = {
  onImport: () => void;
  onExport: () => void;
};

export function QuickActionsCard({ onImport, onExport }: Props) {
  const { can } = useSession();
  const items: Action[] = [];
  if (can("couriers.create")) {
    items.push({ key: "import", label: "Import curieri", icon: Upload, onClick: onImport });
  }
  items.push({ key: "export", label: "Export listă", icon: Download, onClick: onExport });

  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Acțiuni rapide</CardTitle>
      </CardHeader>
      <CardBody className="px-2 pb-2 pt-0">
        <ul className="space-y-1">
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  onClick={item.onClick}
                  className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-fg-muted">
                    <Icon size={14} strokeWidth={2} />
                  </span>
                  <span className="flex-1 text-[12.5px] font-medium text-fg-muted group-hover:text-fg">
                    {item.label}
                  </span>
                  <ChevronRight size={12} className="text-fg-dim group-hover:text-fg-muted" />
                </button>
              </li>
            );
          })}
        </ul>
      </CardBody>
    </Card>
  );
}
