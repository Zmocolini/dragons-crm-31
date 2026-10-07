import assert from "node:assert/strict";
import { isValidCnp, parseIdCardText } from "../src/lib/couriers/id-card";

// CNP construit cu cifra de control corectă: 1 800101 40 0123 + C
const body = "180010140012";
const key = "279146358279";
const sum = [...body].reduce((s, d, i) => s + Number(d) * Number(key[i]), 0);
const cnp = body + (sum % 11 === 10 ? 1 : sum % 11);
assert.ok(isValidCnp(cnp));
assert.ok(!isValidCnp(body + ((Number(cnp[12]) + 1) % 10)), "cifra de control greșită e respinsă");
assert.ok(!isValidCnp("1801301400123"), "luna 13 e respinsă");

// Față de buletin: CNP tipărit cu etichetă
assert.equal(parseIdCardText(`ROMANIA\nCNP ${cnp}\nNume/Nom POPESCU`).cnp, cnp);

// MRZ CI (TD2): numele din linia 1, CNP reconstruit din linia 2 (fără CNP pe față)
const opt = cnp[0] + cnp.slice(7);
const mrz = `IDROUPOPESCU<<ANDREI<MIHAI<<<<<<<<<<<\nKS123456<4ROU8001014M2905137${opt}9`;
const r = parseIdCardText(mrz);
assert.equal(r.fullName, "Andrei Mihai Popescu");
assert.equal(r.cnp, cnp);
assert.equal(r.docNumber, "KS123456");
assert.equal(r.expiryIso, "2029-05-13");

// Zgomot OCR: O în loc de 0, spații, « în loc de <
const noisy = `ID ROU POPESCU«<ANDREI<<<<\nKS12345O<4ROU8OO1014M29O5137${opt}9`;
assert.equal(parseIdCardText(noisy).fullName, "Andrei Popescu");
assert.equal(parseIdCardText(noisy).docNumber, "KS123450");

// Umplutura „<<<" citită ca „LLL" (văzut pe OCR real) nu intră în nume
assert.equal(parseIdCardText("IDROUPOPESCU<<ANDREI<MIHAI<<LLLLLLLL LL").fullName, "Andrei Mihai Popescu");

// Permis de ședere (TD1): linia 3 = nume
assert.equal(parseIdCardText("IRROU1234567<<<<<<<<<<<<<<<<<\n9001011M3001012BGD<<<<<<<<<<<0\nHOSSEIN<<MD<RAHIM<<<<<<<<<<<<<").fullName, "Md Rahim Hossein");

// Pașaport (TD3): prefixul P<BGD nu intră în nume
assert.equal(parseIdCardText("P<BGDHOSSEIN<<MD<RAHIM<<<<<<<<<<<<<<<<<<<<<<<\nA012345674BGD9001011M3001012<<<<<<<<<<<<<<00").fullName, "Md Rahim Hossein");

// Text fără date utile → nimic inventat
assert.deepEqual(parseIdCardText("o poză oarecare\n12345"), {});
console.log("id-card ok");
