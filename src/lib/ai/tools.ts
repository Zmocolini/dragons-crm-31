// Uneltele AI Copilot — schema (format OpenAI function-calling), comună server + client.
// Serverul le trimite la LLM; clientul le execută peste contextele CRM (datele stau în browser).

type JsonSchema = Record<string, unknown>;
export type ToolDef = { type: "function"; function: { name: string; description: string; parameters: JsonSchema } };

const str = (description: string, extra: JsonSchema = {}) => ({ type: "string", description, ...extra });
const num = (description: string) => ({ type: "number", description });
const obj = (properties: Record<string, JsonSchema>, required: string[] = []) => ({ type: "object", properties, required });
const PLATFORMS = { type: "array", items: { type: "string", enum: ["bolt", "wolt", "glovo"] } };
// pending = înregistrat de subcontractor, așteaptă confirmarea flotei; rejected = respins de flotă.
const COURIER_STATUS = ["pending", "draft", "in_activation", "active", "paused", "stopped", "rejected"];
const PLATFORM = { type: "string", enum: ["bolt", "wolt", "glovo"] };
const IDS = { type: "array", items: { type: "string" }, description: "id-uri curieri (din find_couriers / team_overview)" };
const PAYMENT_STATUS = ["unpaid", "partial", "paid", "in_review", "blocked", "issue"];
const DATE = "dată ISO YYYY-MM-DD";

function tool(name: string, description: string, parameters: JsonSchema = obj({})): ToolDef {
  return { type: "function", function: { name, description, parameters } };
}

export const COPILOT_TOOLS: ToolDef[] = [
  // ── Citire ──
  tool("overview", "Rezumat flotă activă: curieri pe status/oraș/platformă, plăți, facturi, documente care expiră, regim TVA."),
  tool("find_couriers", "Caută curieri ai flotei (nume, telefon, oraș, platformă, status). Returnează id-uri pentru alte unelte.", obj({
    query: str("text liber: nume sau telefon"), status: str("status", { enum: COURIER_STATUS }),
    city: str("oraș"), platform: str("platformă", { enum: ["bolt", "wolt", "glovo"] }), limit: num("max rezultate, implicit 20"),
  })),
  tool("list_payments", "Listează plățile flotei, filtrate.", obj({
    status: str("status", { enum: PAYMENT_STATUS }), from: str(`început perioadă, ${DATE}`), to: str(`sfârșit perioadă, ${DATE}`),
    courier: str("nume curier (parțial)"), limit: num("max rezultate, implicit 20"),
  })),
  tool("report_summary", "Raport pe perioadă din plăți: comenzi, brut, net, plătit/neplătit, top curieri, pe platforme.", obj({
    from: str(DATE), to: str(DATE),
  }, ["from", "to"])),
  tool("list_invoices", "Listează facturile flotei.", obj({
    status: str("status", { enum: ["draft", "sent", "paid", "overdue", "cancelled"] }), direction: str("direcție", { enum: ["issued", "received"] }),
  })),
  tool("list_expiring_documents", "Documente care expiră în următoarele N zile (și cele deja expirate).", obj({ days: num("implicit 30") })),
  tool("list_vehicles", "Listează vehiculele flotei cu status."),
  tool("team_overview", "Pe echipe (subcontractori + intern): câți curieri au eroare, de activat, așteaptă loc/acte, în regulă. Cu `team` sau `bucket` întoarce și curierii, cu motive și id-uri.", obj({
    team: str("nume subcontractor sau „Intern” (opțional)"),
    bucket: str("găleata (opțional)", { enum: ["error", "to_activate", "pending", "ok", "inactive"] }),
  })),
  tool("navigate", "Deschide o pagină din CRM pentru utilizator.", obj({
    path: str("ruta", { enum: ["/", "/curieri", "/curieri?segment=asteptare", "/plati", "/facturi", "/vehicule", "/cazari", "/subcontractori", "/rapoarte", "/econtracte", "/setari", "/ai?tab=issues", "/clubul-antreprenorilor"] }),
  }, ["path"])),

  // ── Scriere ──
  tool("create_courier", "Înregistrează un curier nou în flota activă.", obj({
    fullName: str("nume complet"), phone: str("telefon cu prefix, ex +40 712 345 678"), email: str("email"),
    city: str("oraș"), platforms: PLATFORMS,
    vehicleType: str("vehicul", { enum: ["bike", "e_bike", "scooter", "car"] }),
    vehicleOwnership: str("proprietate vehicul", { enum: ["own", "rented"] }),
    collaboration: str("tip contract, text liber (ex. Contract colaborare, PFA, CIM 8h)"),
    nationality: str("naționalitate", { enum: ["ro", "eu", "non_eu"] }),
    status: str("status inițial, implicit in_activation", { enum: COURIER_STATUS }),
  }, ["fullName", "city"])),
  tool("update_courier", "Modifică un curier (status, oraș, telefon, email, platforme, vehicul, contract, comision).", obj({
    id: str("id curier (din find_couriers)"),
    patch: obj({
      fullName: str("nume"), phone: str("telefon"), email: str("email"), city: str("oraș"), platforms: PLATFORMS,
      status: str("status", { enum: COURIER_STATUS }), vehicleType: str("vehicul", { enum: ["bike", "e_bike", "scooter", "car"] }),
      collaboration: str("tip contract, text liber"), commissionPct: num("comision %"),
      weeklyContractFeeRon: num("taxă săptămânală RON"),
    }),
  }, ["id", "patch"])),
  tool("delete_courier", "Șterge un curier. Cere confirmarea utilizatorului.", obj({ id: str("id curier") }, ["id"])),
  tool("activate_couriers", "Activează curieri. Fără `platform`: status → activ (confirmă înregistrările pending, activările în curs). Cu `platform`: îi activează pe platforma pe care așteaptă loc. Cere confirmare.", obj({
    ids: IDS, platform: { ...PLATFORM, description: "platforma pe care așteaptă loc (opțional)" },
  }, ["ids"])),
  tool("reject_couriers", "Respinge înregistrări (pending / în activare / draft) → status respins. Cere confirmare.", obj({
    ids: IDS, reason: str("motiv (opțional)"),
  }, ["ids"])),
  tool("remove_from_waitlist", "Scoate un curier din așteptarea de loc pe o platformă. Cere confirmare.", obj({
    id: str("id curier"), platform: PLATFORM,
  }, ["id", "platform"])),
  tool("set_payment_status", "Schimbă statusul unei plăți (ex: plătită, blocată). Cere confirmare.", obj({
    id: str("id plată"), status: str("status nou", { enum: PAYMENT_STATUS }), reason: str("motiv (opțional)"),
  }, ["id", "status"])),
  tool("add_payment_note", "Adaugă o notă la o plată.", obj({ id: str("id plată"), text: str("nota") }, ["id", "text"])),
  tool("create_invoice", "Creează o factură (ciornă). TVA implicit = regimul flotei (MD 20%, RO 21%, neplătitor 0%).", obj({
    direction: str("issued = emisă, received = primită", { enum: ["issued", "received"] }),
    counterpartyName: str("client / furnizor"), counterpartyCui: str("CUI"), baseRon: num("bază fără TVA, RON"),
    vatPct: num("cota TVA; omite pentru regimul flotei"), number: str("număr; omite pentru auto"),
    issueDate: str(DATE), dueDate: str(DATE), notes: str("note"),
  }, ["direction", "counterpartyName", "baseRon"])),
  tool("create_invoice_from_report", "Factură emisă din raport: baza = suma plăților achitate ale curierilor flotei în perioadă, TVA după regim.", obj({
    from: str(DATE), to: str(DATE), dueDate: str(DATE),
  }, ["from", "to"])),
  tool("set_invoice_status", "Factură: marchează achitată, trimisă, anulează sau șterge. Cere confirmare.", obj({
    id: str("id factură"), action: str("acțiune", { enum: ["paid", "sent", "cancel", "delete"] }),
  }, ["id", "action"])),
  tool("set_vat_regime", "Setează regimul TVA al flotei active. Cere confirmare.", obj({
    country: str("țara", { enum: ["RO", "MD"] }), vatPayer: { type: "boolean", description: "plătitor de TVA?" },
  }, ["country", "vatPayer"])),
  tool("create_ticket", "Deschide un tichet de suport / problemă.", obj({
    subject: str("subiect"), body: str("descriere"), priority: str("prioritate", { enum: ["normal", "high", "urgent"] }),
    category: str("categorie, ex: admin, plata, activare, documente"),
  }, ["subject"])),
];

/** Unelte care nu rulează fără click „Confirm" de la utilizator: bani, ștergeri, regim fiscal, activări. */
export const CONFIRM_TOOLS = new Set([
  "delete_courier", "set_payment_status", "set_invoice_status", "set_vat_regime",
  "activate_couriers", "reject_couriers", "remove_from_waitlist",
]);

/** Confirmarea se cere și pentru `update_courier` când schimbă statusul — altfel ar ocoli activate/reject_couriers. */
export function needsConfirm(name: string, args: Record<string, unknown>): boolean {
  if (CONFIRM_TOOLS.has(name)) return true;
  const patch = args.patch as Record<string, unknown> | undefined;
  return name === "update_courier" && typeof patch?.status === "string" && patch.status.trim() !== "";
}

export const TOOL_LABEL: Record<string, string> = {
  overview: "Rezumat flotă", find_couriers: "Caut curieri", list_payments: "Citesc plăți", report_summary: "Raport",
  list_invoices: "Citesc facturi", list_expiring_documents: "Documente care expiră", list_vehicles: "Vehicule",
  navigate: "Deschid pagina", create_courier: "Înregistrez curier", update_courier: "Modific curier",
  delete_courier: "Șterg curier", set_payment_status: "Status plată", add_payment_note: "Notă plată",
  create_invoice: "Creez factură", create_invoice_from_report: "Factură din raport", set_invoice_status: "Status factură",
  set_vat_regime: "Regim TVA", create_ticket: "Tichet suport",
  team_overview: "Echipe: ce e de activat", activate_couriers: "Activez curieri", reject_couriers: "Resping curieri",
  remove_from_waitlist: "Scot din așteptare",
};
