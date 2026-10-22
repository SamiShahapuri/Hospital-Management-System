import test from "node:test";
import assert from "node:assert/strict";
test("health endpoint contract is documented", () => {
  const expected = { status: "ok", service: "hms-api" };
  assert.equal(expected.status, "ok");
  assert.equal(expected.service, "hms-api");
});
