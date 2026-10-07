import assert from "node:assert/strict";
import { isValidCnp, mrzCheck, parseIdCardText } from "../src/lib/couriers/id-card";

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

// Fața citită + MRZ: câștigă fața (diacritice, cratimă) când se potrivesc
const both = parseIdCardText(`Nume/Nom/Last name\nȘTEFĂNESCU\nPrenume/Prenom/First name\nANDREI-MIHAI\nIDROUSTEFANESCU<<ANDREI<MIHAI<<<<<<<<`);
assert.equal(both.fullName, "Andrei-Mihai Ștefănescu");
assert.equal(both.nameAlt, undefined);
// Fața zgomotoasă care nu se potrivește → MRZ, iar citirea feței rămâne ca alternativă
const clash = parseIdCardText(`Nume/Nom/Last name\nIE RU RADULESCU\nPrenume/Prenom/First name\nMEE\nMEIIDROURADULESCU<<TUDOR<<<<<<`);
assert.equal(clash.fullName, "Tudor Radulescu");
assert.ok(clash.nameAlt);
// Doar MRZ, dar cuvântul cu diacritice apare pe față → se recuperează
assert.equal(parseIdCardText("ȚĂRANU zgomot\nIDROUTARANU<<MIHAIL<<<<<<<<").fullName, "Mihail Țăranu");

// Cedilă → virgulă; cratima recuperată de pe față când numele vine din MRZ
assert.equal(parseIdCardText("Nume/Nom/Last name\nŞTEFĂNESCU\nPrenume/Prenom/First name\nŞTEFAN\nIDROUSTEFANESCU<<STEFAN<<<<<<").fullName, "Ștefan Ștefănescu");
assert.equal(parseIdCardText("zgomot ELENA-IOANA\nIDROUDUMITRU<<ELENA<IOANA<<<<<<<").fullName, "Elena-Ioana Dumitru");

// Permis de ședere (TD1): linia 3 = nume
assert.equal(parseIdCardText("IRROU1234567<<<<<<<<<<<<<<<<<\n9001011M3001012BGD<<<<<<<<<<<0\nHOSSEIN<<MD<RAHIM<<<<<<<<<<<<<").fullName, "Md Rahim Hossein");

// Pașaport (TD3): prefixul P<BGD nu intră în nume
assert.equal(parseIdCardText("P<BGDHOSSEIN<<MD<RAHIM<<<<<<<<<<<<<<<<<<<<<<<\nA012345674BGD9001011M3001012<<<<<<<<<<<<<<00").fullName, "Md Rahim Hossein");

// Text fără date utile → nimic inventat
assert.deepEqual(parseIdCardText("o poză oarecare\n12345"), {});
// ── Mai multe citiri ale rândului 2 (banda MRZ la două mărimi + pagina): câștigă cea coerentă ──
assert.equal(mrzCheck("290513"), 2);
assert.equal(mrzCheck("KS123456<"), 5);
const L1 = "IDROUPOPESCU<<ANDREI<MIHAI<<<<<<<<<<";
const L2 = "KS123456<5ROU8001014M290513214001208"; // cifre de control corecte, inclusiv cea compusă
// O cifră inserată (37 de caractere): cifrele de control aleg varianta reparată, nu „2096-05-13"
assert.equal(parseIdCardText(`${L1}\nKS123456<5R0U8001014M2960513214001208\nCNP 1800101400120`).expiryIso, "2029-05-13");
// Prima citire greșită, a doua corectă → a doua câștigă (înainte câștiga mereu prima)
assert.equal(parseIdCardText(`${L1}\nKS123456<5ROU8001014M296051321400120\n${L2}`).expiryIso, "2029-05-13");
// Data imposibilă nu intră în formular
assert.equal(parseIdCardText(`${L1}\nKS123456<5ROU8001014M296051321400120`).expiryIso, undefined);
// Banda tăiată la margine („DROU…", „S123456…"): numele tot din MRZ, expirarea de pe față
const cut = parseIdCardText("DROULUPU<<CRISTINA<<<<<<<<<<<<<<<<<\nS123456<5R0U8712116F291211024008839\n01.06.1-11.12.2029");
assert.equal(cut.fullName, "Cristina Lupu");
assert.equal(cut.expiryIso, "2029-12-11");
console.log("id-card ok");

// Filtrele de imagine folosite înainte de OCR
import { median3, rgbaToGray, stretchContrast } from "../src/lib/couriers/id-scan-image";
const rgba = new Uint8ClampedArray([100, 100, 100, 255, 150, 150, 150, 255, 200, 200, 200, 255, 120, 120, 120, 255]);
const gs = stretchContrast(rgbaToGray(rgba, 4, 1)).px;
assert.equal(gs[0], 0, "cel mai întunecat → negru");
assert.equal(gs[2], 255, "cel mai luminos → alb");
const spike = { w: 5, h: 5, px: new Uint8Array(25).fill(200) }; spike.px[12] = 0; // punct negru izolat (zgomot)
assert.equal(median3(spike).px[12], 200, "medianul scoate punctul izolat");
console.log("id-ocr filters ok");
