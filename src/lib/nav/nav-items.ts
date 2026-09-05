import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bike,
  CalendarDays,
  Car,
  FileText,
  Hotel,
  LayoutDashboard,
  LifeBuoy,
  Settings,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCog,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import type { Permission } from "@/lib/rbac/roles";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  badge?: "NOU" | "BETA";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, permission: "dashboard.view" },
  { href: "/curieri", label: "Curieri", icon: Bike, permission: "couriers.view" },
  {
    href: "/candidati",
    label: "Candidați (Leaduri)",
    icon: UserPlus,
    permission: "candidates.view",
  },
  { href: "/interviuri", label: "Interviuri", icon: Users, permission: "interviews.view" },
  {
    href: "/activari",
    label: "Activări",
    icon: ShieldCheck,
    permission: "activations.view",
  },
  { href: "/plati", label: "Plăți", icon: Wallet, permission: "payments.view" },
  { href: "/rapoarte", label: "Rapoarte", icon: BarChart3, permission: "reports.view" },
  { href: "/documente", label: "Documente", icon: FileText, permission: "documents.view" },
  { href: "/vehicule", label: "Vehicule", icon: Car, permission: "vehicles.view" },
  { href: "/cazari", label: "Cazări", icon: Hotel, permission: "cazari.view" },
  {
    href: "/subcontractori",
    label: "Subcontractori",
    icon: Trophy,
    permission: "subcontractors.view",
  },
  { href: "/utilizatori", label: "Utilizatori", icon: UserCog, permission: "users.view" },
  {
    href: "/probleme",
    label: "Probleme / Suport",
    icon: LifeBuoy,
    permission: "issues.view",
  },
  { href: "/calendar", label: "Calendar", icon: CalendarDays, permission: "calendar.view" },
  {
    href: "/ai",
    label: "AI Copilot",
    icon: Sparkles,
    permission: "ai.use",
    badge: "NOU",
  },
  { href: "/setari", label: "Setări", icon: Settings, permission: "settings.view" },
];
