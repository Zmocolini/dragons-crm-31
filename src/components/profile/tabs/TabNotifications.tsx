"use client";

import {
  AlertTriangle, CheckSquare, FileText, Info, Megaphone,
  ShieldCheck, Users, Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { hasPermission } from "@/lib/rbac/roles";
import { useToast } from "@/components/ui/Toast";
import { Switch } from "@/components/ui/Switch";
import type { NotificationPrefKey, NotificationPrefs } from "@/lib/profile/types";
import type { Permission } from "@/lib/rbac/roles";
import { cn } from "@/lib/utils/cn";

type Row = {
  key: NotificationPrefKey;
  icon: LucideIcon;
  iconTone: string;
  label: string;
  description: string;
  permission?: Permission;
};

const ROWS: Row[] = [
  { key: "payments",            icon: Wallet,        iconTone: "text-emerald-400",  label: "Plăți săptămânale",      description: "Primește notificări când sunt procesate plățile.",         permission: "payments.view" },
  { key: "documents_expired",   icon: FileText,      iconTone: "text-amber-400",    label: "Documente expirate",     description: "Alerte pentru documente care urmează să expire.",           permission: "documents.view" },
  { key: "activations_blocked", icon: ShieldCheck,   iconTone: "text-sky-400",      label: "Activări blocate",       description: "Notificări pentru activări care necesită atenție.",         permission: "activations.view" },
  { key: "issues_urgent",       icon: AlertTriangle, iconTone: "text-rose-400",     label: "Probleme urgente",       description: "Alerte pentru probleme critice în flotă.",                   permission: "issues.view" },
  { key: "interviews",          icon: Users,         iconTone: "text-violet-400",   label: "Interviuri",              description: "Notificări pentru interviuri programate.",                  permission: "interviews.view" },
  { key: "tasks",               icon: CheckSquare,   iconTone: "text-indigo-400",   label: "Task-uri",                description: "Memento-uri pentru task-urile tale." },
  { key: "subcontractors",      icon: Users,         iconTone: "text-orange-400",   label: "Subcontractori",         description: "Notificări despre subcontractori și contracte.",            permission: "subcontractors.view" },
  { key: "announcements",       icon: Megaphone,     iconTone: "text-fuchsia-400",  label: "Anunțuri generale",      description: "Informații importante din partea echipei." },
];

export function TabNotifications() {
  const { profile, updateProfile, logActivity } = useProfile();
  const { user } = useSession();
  const toast = useToast();

  const [draft, setDraft] = useState<NotificationPrefs>(profile.notifications);
  useEffect(() => setDraft(profile.notifications), [profile.notifications]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(profile.notifications);

  const visible = ROWS.filter((r) => !r.permission || hasPermission(user.role, r.permission));

  function toggle(key: NotificationPrefKey, value: boolean) {
    setDraft((prev) => ({
      ...prev,
      [key]: { in_app: value, email: false }, // email dezactivat global — vezi TabNotifications
    }));
  }

  function save() {
    updateProfile({ notifications: draft });
    logActivity("notification_preferences.update", "Actualizare notificări în aplicație");
    toast.success("Preferințele notificări au fost salvate.");
  }

  function reset() {
    setDraft(profile.notifications);
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-card">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
          <div>
            <h3 className="text-[15px] font-semibold text-fg">Preferințe notificări</h3>
            <p className="text-[11.5px] text-fg-muted">
              Alege ce notificări vrei să primești în aplicație.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {dirty && (
              <button
                type="button"
                onClick={reset}
                className="rounded-lg border border-line bg-card-2 px-3 py-1.5 text-[12px] font-medium text-fg-muted hover:bg-card-hover hover:text-fg"
              >
                Anulează
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty}
              className={cn(
                "rounded-lg px-4 py-1.5 text-[12.5px] font-semibold text-white transition-colors",
                dirty ? "bg-violet-600 hover:bg-violet-500" : "cursor-not-allowed bg-white/[0.06] text-fg-dim",
              )}
            >
              Salvează modificările
            </button>
          </div>
        </header>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse">
            <thead className="border-b border-line/50">
              <tr>
                <TH className="w-[260px]">Categorie</TH>
                <TH className="w-[130px] text-center">Activ</TH>
                <TH>Descriere</TH>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {visible.map((r) => {
                const p = draft[r.key];
                const Icon = r.icon;
                return (
                  <tr key={r.key} className="text-[12.5px]">
                    <TD>
                      <div className="flex items-center gap-2.5">
                        <Icon size={14} className={cn("shrink-0", r.iconTone)} />
                        <span className="font-semibold text-fg">{r.label}</span>
                      </div>
                    </TD>
                    <TD className="text-center">
                      <div className="inline-flex">
                        <Switch
                          checked={p.in_app}
                          onChange={(v) => toggle(r.key, v)}
                          ariaLabel={`${r.label} — activ`}
                        />
                      </div>
                    </TD>
                    <TD className="text-fg-muted">{r.description}</TD>
                  </tr>
                );
              })}
              {visible.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-5 py-8 text-center text-[12.5px] text-fg-muted">
                    Rolul tău nu are categorii de notificare disponibile.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-start gap-3 border-t border-line/60 bg-card-2/40 px-5 py-3.5 text-[11.5px] text-fg-muted">
          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-300">
            <Info size={12} />
          </span>
          <div>
            <strong className="text-fg">Notă:</strong> Vei primi întotdeauna notificări critice legate de
            securitatea contului, indiferent de setările de mai sus. Notificările prin email nu sunt
            disponibile momentan.
          </div>
        </div>
      </section>
    </div>
  );
}

function TH({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={cn(
        "px-5 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim",
        className,
      )}
    >
      {children}
    </th>
  );
}
function TD({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("px-5 py-3 align-middle", className)}>{children}</td>;
}
