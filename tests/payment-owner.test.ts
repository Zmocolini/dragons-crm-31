import assert from "node:assert/strict";
import { paymentOwner } from "../src/lib/payments/owner";

// subcontractorul: mereu el (serverul respinge orice altceva)
assert.equal(paymentOwner({ role: "subcontractor_owner", userEmail: "a@x.ro", scopeEmail: null, courierOwner: "owner@x.ro" }), "a@x.ro");
// owner: plata urmează proprietarul curierului
assert.equal(paymentOwner({ role: "global_owner", userEmail: "owner@x.ro", scopeEmail: null, courierOwner: "a@x.ro" }), "a@x.ro");
// owner cu scope, curier necunoscut → subcontractorul din scope
assert.equal(paymentOwner({ role: "global_owner", userEmail: "owner@x.ro", scopeEmail: "h@x.ro", courierOwner: null }), "h@x.ro");
// proprietarul curierului bate scope-ul (plata unui curier al lui Ahsal rămâne a lui Ahsal)
assert.equal(paymentOwner({ role: "global_owner", userEmail: "owner@x.ro", scopeEmail: "h@x.ro", courierOwner: "a@x.ro" }), "a@x.ro");
// createdBy vechi (nume, nu email) al curierului nu e proprietar valid
assert.equal(paymentOwner({ role: "global_owner", userEmail: "owner@x.ro", scopeEmail: null, courierOwner: "Ion Popescu" }), "owner@x.ro");
// nimic cunoscut → owner-ul însuși
assert.equal(paymentOwner({ role: "global_owner", userEmail: "Owner@X.ro", scopeEmail: null, courierOwner: null }), "owner@x.ro");
console.log("payment-owner: OK");
