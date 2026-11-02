import test from "node:test";
import assert from "node:assert/strict";
import { isValidEmail, parseFutureDate, normalizeBillItems } from "../src/utils/validation.js";

test("email validation accepts normal addresses and rejects malformed values", () => {
  assert.equal(isValidEmail("patient@example.com"), true);
  assert.equal(isValidEmail("  patient@example.com  "), true);
  assert.equal(isValidEmail("not-an-email"), false);
  assert.equal(isValidEmail("patient@localhost"), false);
  assert.equal(isValidEmail(""), false);
  assert.equal(isValidEmail(42), false);
});

test("future-date validation accepts a valid date after the supplied clock", () => {
  const now = new Date("2026-10-29T10:00:00.000Z");
  const result = parseFutureDate("2026-10-29T10:15:00.000Z", now);
  assert.ok(result instanceof Date);
  assert.equal(result.toISOString(), "2026-10-29T10:15:00.000Z");
});

test("future-date validation rejects empty, malformed, and past dates", () => {
  const now = new Date("2026-10-29T10:00:00.000Z");
  assert.equal(parseFutureDate("", now), null);
  assert.equal(parseFutureDate("not-a-date", now), null);
  assert.equal(parseFutureDate("2026-10-29T10:00:00.000Z", now), null);
  assert.equal(parseFutureDate("2026-10-28T10:00:00.000Z", now), null);
  assert.equal(parseFutureDate(null, now), null);
});

test("bill item normalization calculates line totals and subtotal on the server", () => {
  const result = normalizeBillItems([
    { description: "Consultation", quantity: "2", unitPrice: "250.25" },
    { description: "Lab test", quantity: 1, unitPrice: 99.5 }
  ]);
  assert.equal(result.error, undefined);
  assert.deepEqual(result.items.map(({ lineTotal }) => lineTotal), [500.5, 99.5]);
  assert.equal(result.subtotal, 600);
});

test("bill normalization rejects an empty invoice", () => {
  assert.match(normalizeBillItems([]).error, /between 1 and 20/);
});

test("bill normalization rejects missing descriptions", () => {
  assert.match(normalizeBillItems([{ description: " ", quantity: 1, unitPrice: 2 }]).error, /description/);
});

test("bill normalization rejects invalid quantities", () => {
  for (const quantity of [0, -1, 1.5, 1001, "not-a-number"]) {
    assert.ok(normalizeBillItems([{ description: "Item", quantity, unitPrice: 2 }]).error);
  }
});

test("bill normalization rejects negative and excessive prices", () => {
  for (const unitPrice of [-0.01, Infinity, NaN, 1000001]) {
    assert.ok(normalizeBillItems([{ description: "Item", quantity: 1, unitPrice }]).error);
  }
});

test("bill normalization refuses more than twenty line items", () => {
  const items = Array.from({ length: 21 }, (_, i) => ({ description: `Item ${i}`, quantity: 1, unitPrice: 1 }));
  assert.match(normalizeBillItems(items).error, /between 1 and 20/);
});
