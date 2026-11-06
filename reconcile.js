// Payment reconciliation.
//
// Reads payments.jsonl and works out how much money we actually collected.
// Run:  node reconcile.js

const fs = require("fs");
const path = require("path");

const latestByTransaction = new Map();

const lines = fs.readFileSync(path.join(__dirname, "payments.jsonl"), "utf8").split(/\r?\n/);
for (const line of lines) {
  let event;
  try {
    event = JSON.parse(line);
  } catch {
    // The export may contain malformed lines. Ignore those and continue.
    continue;
  }

  if (event == null || event.txn_id == null || event.txn_id === "") {
    continue;
  }

  const previous = latestByTransaction.get(event.txn_id);
  // File order is not chronological: compare the event timestamps.
  if (!previous || Date.parse(event.ts) > Date.parse(previous.ts)) {
    latestByTransaction.set(event.txn_id, event);
  }
}

let totalKobo = 0;
let count = 0;
for (const event of latestByTransaction.values()) {
  if (event.status !== "success") continue;

  // Amounts may contain thousands separators. Sum integer kobo to avoid
  // accumulating floating-point errors when adding naira values.
  const amount = Number(String(event.amount).replace(/,/g, ""));
  totalKobo += Math.round(amount * 100);
  count += 1;
}

const expected = parseInt(fs.readFileSync(path.join(__dirname, "expected.txt"), "utf8").trim(), 10);

if (count !== expected) {
  console.log(`Check failed: counted ${count} successful payments, expected ${expected}.`);
  console.log("Something in the data isn't being handled the way the README describes.");
} else {
  console.log(`Check passed: ${count} successful payments.`);
  console.log(`Your code: KOYA-${Math.round(totalKobo / 100)}`);
}
