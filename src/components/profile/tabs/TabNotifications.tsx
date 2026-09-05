"use client";

import { useProfile } from "@/lib/profile/context";
import { useSession } from "@/lib/rbac/session";
import { hasPermission } from "@/lib/rbac/roles";
import { useToast } from "@/components/ui/Toast";
import { Switch } from "@/components/ui/Switch";
import type { NotificationPrefKey, NotificationChannel } from "@/lib/profile/types";
import type { Permission } from "@/lib/rbac/roles";

type Row = {
  key: NotificationPrefKey;
  label: string;
  description: string;
  permission?: Permission;
};

const ROWS: Row[] = [
  {
    key: "payments",
    label: "Plăți săptămânale",
    description: "Notificări când se procesează plăți sau apar plăți în așteptare.",
    permission: "payments.view",
  },
  {
    key: "documents_expired",
    label: "Documente expirate",
    description: "Alerte când documentele curierilor sunt aproape de expirare.",
    permission: "documents.view",
  },
  {
    key: "activations_blocked",
    label: "Activări blocate",
    description: "Când o activare rămâne blocată sau necesită intervenție.",
    permission: "activations.view",
  },
  {
    key: "issues_urgent",
    label: "Probleme urgente",
    description: "Probleme deschise cu prioritate ridicată.",
    permission: "issues.view",
  },
  {
    key: "tasks",
    label: "Task-uri",
    description: "Reamintiri pentru task-urile tale din dashboard.",
  },
  {
    key: "interviews",
    label: "Interviuri",
    description: "Interviuri programate sau anulate.",
    permission: "interviews.view",
  },
  {
    key: "subcontractors",
    label: "Subcontractori",
    description: "Update-uri legate de flota subcontractată.",
    permission: "subcontractors.view",
  },
];

export function TabNotifications() {
  const { profile, setNotification, logActivity } = useProfile();
  const { user } = useSession();
  const toast = useToast();

  const visible = ROWS.filter(
    (r) => !r.permission || hasPermission(user.role, r.permission),
  );

  function toggle(key: NotificationPrefKey, channel: NotificationChannel, next: boolean) {
    setNotification(key, channel, next);
    logActivity("notification_preferences.update", `${key}.${channel} = ${next ? "ON" : "OFF"}`);
    toast.success(
      "Preferințele de notificare au fost actualizate.",
      `${key} · ${channel === "in_app" ? "în aplicație" : "email"} → ${next ? "activat" : "dezactivat"}`,
    );
  }

  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <header className="border-b border-line/70 px-5 py-3.5">
          <h3 className="text-[15px] font-semibold text-fg">Preferințe notificări</h3>
          <p className="text-[11.5px] text-fg-muted">
            Alege pentru fiecare categorie unde vrei să primești alerte.
          </p>
        </header>
        <div className="hidden grid-cols-[1fr_100px_100px] items-center gap-4 border-b border-line/50 px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-wider text-fg-dim md:grid">
          <div>Categorie</div>
          <div className="text-center">În aplicație</div>
          <div className="text-center">Email</div>
        </div>
        <ul className="divide-y divide-line/40">
          {visible.map((r) => {
            const p = profile.notifications[r.key];
            return (
              <li
                key={r.key}
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 md:grid-cols-[1fr_100px_100px]"
              >
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold text-fg">{r.label}</div>
                  <div className="mt-0.5 text-[11.5px] text-fg-muted">{r.description}</div>
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={p.in_app}
                    onChange={(v) => toggle(r.key, "in_app", v)}
                    ariaLabel={`${r.label} — în aplicație`}
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={p.email}
                    onChange={(v) => toggle(r.key, "email", v)}
                    ariaLabel={`${r.label} — email`}
                  />
                </div>
              </li>
            );
          })}
          {visible.length === 0 && (
            <li className="px-5 py-8 text-center text-[12.5px] text-fg-muted">
              Rolul tău nu are categorii de notificare disponibile.
            </li>
          )}
        </ul>
      </section>
    </div>
  );
}
