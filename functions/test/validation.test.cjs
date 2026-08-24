const assert = require("node:assert/strict");
const test = require("node:test");
const { normalizePhone, validateLead } = require("../lib/validation.js");

const base = {
  submissionId: "3fbaf1ee-3a7a-4d2b-bcb8-0d78f721fa92",
  serviceType: "reconstruction",
  propertyType: "house",
  location: "Mělník",
  scope: "complete",
  name: "QA Test",
  phone: "+420 777 000 000",
  email: "qa@example.invalid",
  privacyAcknowledged: "true",
};

test("normalizes Czech phone numbers", () => {
  assert.equal(normalizePhone("00420 777 000 000"), "+420777000000");
  assert.equal(normalizePhone("777 000 000"), "+420777000000");
});

test("accepts a complete reconstruction lead and preserves attribution", () => {
  const result = validateLead({
    ...base,
    utm_source: "meta",
    ad_id: "ad-123",
    landingVariant: "r3",
    marketingConsent: "true",
    metaFbp: "fb.1.1724500000000.1234567890",
    metaFbc: "fb.1.1724500000000.IwAR-test-click-id",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.serviceType, "reconstruction");
    assert.equal(result.value.details.scope, "complete");
    assert.equal(result.value.utmSource, "meta");
    assert.equal(result.value.adId, "ad-123");
    assert.equal(result.value.landingVariant, "r3");
    assert.equal(result.value.marketingConsent, true);
    assert.equal(result.value.metaFbp, "fb.1.1724500000000.1234567890");
    assert.equal(result.value.metaFbc, "fb.1.1724500000000.IwAR-test-click-id");
  }
});

test("does not trust malformed Meta measurement identifiers", () => {
  const result = validateLead({
    ...base,
    marketingConsent: "true",
    metaFbp: "not-a-meta-cookie",
    metaFbc: "invalid",
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.value.metaFbp, null);
    assert.equal(result.value.metaFbc, null);
  }
});

test("requires buyout-specific fields", () => {
  const result = validateLead({
    ...base,
    serviceType: "buyout",
    propertyType: "land",
    scope: "",
  });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.salePath);
    assert.ok(result.errors.relationship);
  }
});

test("rejects non-v4 submission identifiers and missing privacy acknowledgement", () => {
  const result = validateLead({ ...base, submissionId: "not-a-uuid", privacyAcknowledged: "false" });
  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.ok(result.errors.form);
    assert.ok(result.errors.privacyAcknowledged);
  }
});
