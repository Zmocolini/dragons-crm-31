import type { Courier, CourierStatus } from "@/lib/couriers/types";
import type { PlatformKey } from "@/lib/dashboard/types";

/** Date de test pe producție: 2 subcontractori + curierii lor. Totul e marcat (domeniul rezervat `.test`, id-uri `courier_test_*`)
 *  ca să poată fi șters exact, fără să atingă datele reale. */
export const TEST_EMAIL_DOMAIN = "subcontractor.test";

type Spec = { name: string; city: string; platform: PlatformKey; status: CourierStatus; daysInStatus: number };

export const TEST_SUBCONTRACTORS: { key: string; name: string; email: string; couriers: Spec[] }[] = [
  {
    key: "ahsal", name: "Ahsal", email: `ahsal@${TEST_EMAIL_DOMAIN}`,
    couriers: [
      { name: "Rahim Uddin (test)", city: "București", platform: "glovo", status: "active", daysInStatus: 20 },
      { name: "Sajid Karim (test)", city: "București", platform: "bolt", status: "active", daysInStatus: 14 },
      { name: "Imran Hossain (test)", city: "București", platform: "wolt", status: "in_activation", daysInStatus: 7 },
      { name: "Nasir Ahmed (test)", city: "Cluj-Napoca", platform: "glovo", status: "draft", daysInStatus: 2 },
      { name: "Tanvir Islam (test)", city: "Cluj-Napoca", platform: "bolt", status: "active", daysInStatus: 9 },
    ],
  },
  {
    key: "hossein", name: "Hossein", email: `hossein@${TEST_EMAIL_DOMAIN}`,
    couriers: [
      { name: "Reza Ahmadi (test)", city: "Timișoara", platform: "bolt", status: "active", daysInStatus: 12 },
      { name: "Omid Karimi (test)", city: "Timișoara", platform: "glovo", status: "in_activation", daysInStatus: 3 },
      { name: "Farid Rahimi (test)", city: "Iași", platform: "wolt", status: "paused", daysInStatus: 6 },
    ],
  },
];

const DAY_MS = 86_400_000;

/** Curierii de test, cu id-uri deterministe (re-rularea suprascrie, nu dublează). */
export function buildTestCouriers(nowMs: number, tenantId: string): Courier[] {
  return TEST_SUBCONTRACTORS.flatMap((sub) => sub.couriers.map((c, i): Courier => {
    const since = new Date(nowMs - c.daysInStatus * DAY_MS).toISOString();
    return {
      id: `courier_test_${sub.key}_${i + 1}`,
      fullName: c.name,
      phone: `+40 700 000 ${sub.key === "ahsal" ? 1 : 2}${String(i + 1).padStart(2, "0")}`,
      email: null,
      nationality: "non_eu",
      city: c.city,
      platforms: [c.platform],
      vehicleType: c.platform === "bolt" ? "scooter" : "e_bike",
      vehicleOwnership: "own",
      collaboration: "collaboration",
      commissionPct: 10,
      weeklyContractFeeRon: 210,
      status: c.status,
      statusSinceIso: since,
      incompleteFields: [],
      createdAtIso: since,
      createdBy: sub.email,
      tenantId,
    };
  }));
}
