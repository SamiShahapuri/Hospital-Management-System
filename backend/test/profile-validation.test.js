import test from "node:test";
import assert from "node:assert/strict";
import { validateProfileUpdates } from "../src/utils/profileValidation.js";

test("profile updates accept contact details and photo", () => {
  const result = validateProfileUpdates({
    email: " patient@example.com ", phone: "+91 98765 43210", photo: ""
  });
  assert.equal(result.error, undefined);
  assert.deepEqual(result.updates, {
    email: "patient@example.com", phone: "+91 98765 43210", photo: ""
  });
});

test("patient profile permits address while doctor profile does not", () => {
  assert.equal(validateProfileUpdates({ address: "Bengaluru" }, { allowAddress: true }).error, undefined);
  assert.match(validateProfileUpdates({ address: "Bengaluru" }).error, /Identity details are protected/);
});

test("profile update rejects changes to protected identity fields", () => {
  for (const field of ["name", "fullName", "bloodGroup", "specialization", "department", "dateOfBirth"]) {
    assert.match(validateProfileUpdates({ [field]: "Changed" }).error, /Identity details are protected/);
  }
});

test("profile update rejects malformed contact numbers", () => {
  assert.match(validateProfileUpdates({ phone: "123" }).error, /valid contact number/);
  assert.match(validateProfileUpdates({ phone: "abc1234567" }).error, /valid contact number/);
});

test("profile update validates email and image MIME type and size", () => {
  assert.match(validateProfileUpdates({ email: "not-an-email" }).error, /valid email/);
  assert.match(validateProfileUpdates({ photo: "data:image/svg+xml;base64,PHN2Zy8+" }).error, /PNG, JPG or WEBP/);
  const largePayload = "A".repeat(2_100_010);
  assert.match(validateProfileUpdates({ photo: `data:image/png;base64,${largePayload}` }).error, /1.5 MB/);
});


test("empty profile payload is rejected without throwing", () => {
  assert.match(validateProfileUpdates(undefined).error, /Choose at least one/);
  assert.match(validateProfileUpdates(null).error, /Choose at least one/);
});
