import assert from "node:assert/strict";
import { dateWords } from "../src/lib/i18n/translator";

assert.equal(dateWords("Luni, 5 Octombrie 2026", "en"), "Monday, 5 October 2026");
assert.equal(dateWords("05 - 11 Octombrie 2026", "en"), "05 - 11 October 2026");
assert.equal(dateWords("Add a note on Sâmbătă", "en"), "Add a note on Saturday");
assert.equal(dateWords("Luni, 5 Octombrie 2026", "ru"), "Понедельник, 5 октября 2026");
assert.equal(dateWords("Octombrie 2026", "ru"), "Октябрь 2026");
assert.equal(dateWords("Luni, 5 Octombrie 2026", "hi"), "सोमवार, 5 अक्टूबर 2026");
// cuvinte obișnuite rămân neatinse
assert.equal(dateWords("ultimele 3 luni", "en"), "ultimele 3 luni");
assert.equal(dateWords("mai mult decât comenzi", "en"), "mai mult decât comenzi");
assert.equal(dateWords("Lun, 05 oct", "en"), "Mon, 05 Oct");
assert.equal(dateWords("Lun, 05 oct", "ru"), "Пн, 05 окт");
assert.equal(dateWords("05 – 11 Oct", "hi"), "05 – 11 अक्टू");
assert.equal(dateWords("mar și mai", "en"), "mar și mai");
console.log("i18n-dates: OK");
