import assert from "node:assert/strict";
import { extractBlobs, referencedHashes, restoreBlobs } from "../src/lib/backup/blobs";

const big = "data:image/jpeg;base64," + "A".repeat(50_000);
const docs = JSON.stringify([{ id: "d1", name: "buletin", url: big }, { id: "d2", name: "copie", url: big }, { id: "d3", url: "x" }]);
const small = JSON.stringify([{ id: "c1" }]);
const keys = { "crm31-documents": docs, "crm31-couriers": small };

const { slim, blobs } = extractBlobs(keys);
assert.equal(blobs.size, 1);                                   // același conținut = o singură dată
assert.ok(slim["crm31-documents"].length < 1000);              // snapshot-ul s-a subțiat
assert.equal(slim["crm31-couriers"], small);                   // valorile mici rămân neatinse
assert.equal(referencedHashes(slim).length, 1);
assert.deepEqual(JSON.parse(restoreBlobs(slim, blobs)["crm31-documents"]), JSON.parse(docs)); // dus-întors identic
assert.deepEqual(extractBlobs(slim).blobs.size, 0);            // idempotent pe un snapshot deja subțire
assert.throws(() => restoreBlobs(slim, new Map()), /blob lipsă/); // referință orfană = eroare, nu date corupte
const notJson = { "crm31-x": "z".repeat(30_000) };
assert.deepEqual(extractBlobs(notJson).slim, notJson);         // ne-JSON mare: neatins
console.log("backup-blobs ok");
