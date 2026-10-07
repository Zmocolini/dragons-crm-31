import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bike,
  Car,
  Clock,
  Hotel,
  LayoutDashboard,
  Receipt,
  Settings,
  Sparkles,
  Trophy,
  Handshake,

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
  { href: "/curieri-in-asteptare", label: "Curieri în așteptare", icon: Clock, permission: "couriers.view" },
  { href: "/plati", label: "Plăți", icon: Wallet, permission: "payments.view" },
  { href: "/facturi", label: "Facturi", icon: Receipt, permission: "payments.view" },
  { href: "/vehicule", label: "Vehicule", icon: Car, permission: "vehicles.view" },
  { href: "/cazari", label: "Cazări", icon: Hotel, permission: "cazari.view" },
  { href: "/subcontractori", label: "Subcontractori", icon: Trophy, permission: "subcontractors.view" },
  { href: "/rapoarte", label: "Rapoarte", icon: BarChart3, permission: "reports.view" },
  { href: "/ai", label: "AI Copilot", icon: Sparkles, permission: "ai.use", badge: "NOU" },
  { href: "/setari", label: "Setări", icon: Settings, permission: "settings.view" },
  { href: "/clubul-antreprenorilor", label: "Clubul Antreprenorilor", icon: Handshake, permission: "settings.view" },
];
