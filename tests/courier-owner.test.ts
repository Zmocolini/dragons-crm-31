import assert from "node:assert/strict";
import { courierOwner, type AccountInfo } from "../src/lib/couriers/use-account-directory";

const dir = new Map<string, AccountInfo>([
  ["own@x.ro", { name: "Owner", role: "global_owner" }],
  ["sub@x.ro", { name: "Husein SRL", role: "subcontractor_owner" }],
]);
assert.deepEqual(courierOwner({ createdBy: "own@x.ro" }, dir), { kind: "internal", label: "Intern" });
assert.deepEqual(courierOwner({ createdBy: "SUB@x.ro" }, dir), { kind: "subcontractor", label: "Husein SRL" });
assert.deepEqual(courierOwner({ createdBy: "necunoscut@x.ro" }, dir), { kind: "internal", label: "Intern" });
assert.deepEqual(courierOwner({ createdBy: "" }, dir), { kind: "internal", label: "Intern" });
assert.deepEqual(courierOwner({ createdBy: "own@x.ro", subcontractorName: "Alfa SRL" }, dir), { kind: "subcontractor", label: "Alfa SRL" });
console.log("courier-owner: OK");
