import assert from "node:assert/strict";
import { ROLES, hasPermission } from "../src/lib/rbac/roles";

// Regula: doar Global Owner vede subcontractorii și schimbă flota; subcontractorii nu se văd între ei și nici pe ei.
// UI-ul (meniu, FleetCard, insigne, filtre, export) se ghidează după aceste două permisiuni.
for (const role of ROLES) {
  const owner = role === "global_owner";
  assert.equal(hasPermission(role, "subcontractors.view"), owner, `subcontractors.view pentru ${role}`);
  assert.equal(hasPermission(role, "tenant.switch"), owner, `tenant.switch pentru ${role}`);
}
console.log("rbac ok");
