import assert from "node:assert/strict";
import { weeklyNet, weeklyVehicleCost } from "../src/lib/couriers/vehicle-cost";

// Închiriat: doar chiria contează, indiferent de tip
assert.equal(weeklyVehicleCost("rented", "e_bike", { rentWeeklyRon: 150, kmPerDay: 100 }), 150);
// Mașină proprie: 80 km × 6 zile × 6.5 L/100 × 7.6 RON = 237.12
assert.equal(weeklyVehicleCost("own", "car", { kmPerDay: 80, daysPerWeek: 6, consumptionL100: 6.5, fuelPriceRon: 7.6 }), 237.12);
// Bicicletă proprie: fără combustibil
assert.equal(weeklyVehicleCost("own", "bike", { kmPerDay: 80, daysPerWeek: 6, consumptionL100: 6.5, fuelPriceRon: 7.6 }), 0);
// Valori negative/goale nu produc costuri negative
assert.equal(weeklyVehicleCost("own", "car", { kmPerDay: -10, daysPerWeek: 6, consumptionL100: 6.5, fuelPriceRon: 7.6 }), 0);
assert.equal(weeklyVehicleCost("rented", "car", {}), 0);

// Net: 2000 brut, 10% comision, 210 taxă, 237.12 vehicul → 1352.88
assert.deepEqual(weeklyNet(2000, 10, 210, 237.12), { commission: 200, net: 1352.88 });
console.log("vehicle-cost ok");
