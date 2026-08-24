#!/usr/bin/env node

import { randomUUID } from 'node:crypto';

const args = new Map();
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (!argument.startsWith('--')) continue;
  const [name, inlineValue] = argument.slice(2).split('=', 2);
  const next = process.argv[index + 1];
  const value = inlineValue ?? (next && !next.startsWith('--') ? process.argv[++index] : 'true');
  args.set(name, value);
}

const endpointValue = args.get('endpoint') || process.env.CEFIP_LEAD_ENDPOINT;
const confirmed = args.get('confirm-write') === 'true';
const includePhoto = args.get('photo') === 'true';
const serviceType = args.get('service') || 'reconstruction';
const appCheckToken = args.get('app-check-token') || process.env.FIREBASE_APP_CHECK_TOKEN;

if (!endpointValue || args.has('help')) {
  console.log(`Usage:
  node scripts/qa-lead-endpoint.mjs --endpoint https://HOST/api/leads --confirm-write \\
    [--service reconstruction|buyout] [--photo] [--origin https://HOST] \\
    [--app-check-token TOKEN]

Environment alternative:
  CEFIP_LEAD_ENDPOINT=https://HOST/api/leads

This test writes one clearly labelled synthetic lead, retries the same
submission ID to verify idempotency, and sends one invalid request.`);
  process.exit(endpointValue ? 0 : 2);
}

if (!confirmed) {
  console.error('Refusing to write test data. Re-run with --confirm-write.');
  process.exit(2);
}

if (!['reconstruction', 'buyout'].includes(serviceType)) {
  console.error('--service must be reconstruction or buyout.');
  process.exit(2);
}

const endpoint = new URL(endpointValue);
if (!['http:', 'https:'].includes(endpoint.protocol)) {
  throw new Error('Endpoint must use HTTP or HTTPS.');
}

const requestOrigin = args.get('origin') || endpoint.origin;
const submissionId = randomUUID();
const qaMarker = `CEFIP-AUTOMATED-QA-${serviceType}-${submissionId}`;
const headers = { Origin: requestOrigin, Accept: 'application/json' };
if (appCheckToken) headers['X-Firebase-AppCheck'] = appCheckToken;

function add(form, values) {
  for (const [key, value] of Object.entries(values)) form.set(key, String(value));
  return form;
}

function validForm() {
  const form = add(new FormData(), {
    submissionId,
    serviceType,
    landingVariant: serviceType === 'reconstruction' ? 'r5' : 'v5',
    propertyType: 'house',
    location: 'QA TEST',
    scope: serviceType === 'reconstruction' ? 'unknown' : '',
    timeline: 'later',
    salePath: serviceType === 'buyout' ? 'direct_buyout' : '',
    propertyCondition: serviceType === 'buyout' ? 'before_renovation' : '',
    relationship: serviceType === 'buyout' ? 'owner' : '',
    message: `${qaMarker} — synthetic test record; safe to delete.`,
    name: 'Automated QA Test',
    phone: '+420 000 000 000',
    email: `qa+${submissionId}@example.invalid`,
    contactPreference: 'email',
    privacyAcknowledged: 'true',
    website: '',
    utm_source: 'automated_qa',
    utm_medium: 'test',
    utm_campaign: qaMarker,
    landingPath: serviceType === 'reconstruction' ? '/rekonstrukce' : '/vykup-nemovitosti',
    referrerOrigin: requestOrigin,
  });

  if (includePhoto) {
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
      'base64',
    );
    form.append('photos', new Blob([png], { type: 'image/png' }), 'qa-pixel.png');
  }
  return form;
}

function invalidForm() {
  return add(new FormData(), {
    submissionId: randomUUID(),
    serviceType,
    landingVariant: 'invalid-variant',
    propertyType: '',
    location: 'X',
    scope: '',
    salePath: '',
    relationship: '',
    name: 'Q',
    phone: '123',
    email: 'not-an-email',
    privacyAcknowledged: 'false',
    website: '',
    message: `${qaMarker} — intentionally invalid request; must not be stored.`,
  });
}

async function post(label, form) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: form,
    signal: AbortSignal.timeout(30_000),
  });
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json')) {
    throw new Error(`${label}: expected JSON, received ${contentType || 'no content type'} (HTTP ${response.status}).`);
  }
  const body = await response.json();
  console.log(`${label}: HTTP ${response.status}`, body);
  return { response, body };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

console.log(`Endpoint: ${endpoint}`);
console.log(`Origin:   ${requestOrigin}`);
console.log(`Service:  ${serviceType}`);
console.log(`QA marker: ${qaMarker}`);

const first = await post('valid', validForm());
assert(first.response.status === 201, `valid: expected HTTP 201, received ${first.response.status}.`);
assert(first.body?.ok === true, 'valid: expected { ok: true }.');
assert(typeof first.body?.leadId === 'string' && first.body.leadId.length > 0, 'valid: missing leadId.');
assert(typeof first.body?.eventId === 'string' && first.body.eventId.length > 0, 'valid: missing eventId.');
if (includePhoto) {
  assert(first.body?.uploaded === 1, `valid photo: expected uploaded=1, received ${String(first.body?.uploaded)}.`);
  assert(first.body?.uploadWarning === false, 'valid photo: unexpected uploadWarning.');
}

const duplicate = await post('duplicate', validForm());
assert(duplicate.response.status === 201, `duplicate: expected HTTP 201, received ${duplicate.response.status}.`);
assert(duplicate.body?.ok === true, 'duplicate: expected { ok: true }.');
assert(duplicate.body?.leadId === first.body.leadId, 'duplicate: leadId changed; a second lead may have been created.');
assert(duplicate.body?.eventId === first.body.eventId, 'duplicate: eventId changed; idempotency contract was broken.');
if (includePhoto) {
  assert(duplicate.body?.uploaded === 0, 'duplicate photo: attachment should not be uploaded twice.');
  assert(duplicate.body?.uploadWarning === false, 'duplicate photo: duplicate must not report an upload warning.');
}

const invalid = await post('invalid', invalidForm());
assert(invalid.response.status === 422, `invalid: expected HTTP 422, received ${invalid.response.status}.`);
assert(invalid.body?.ok === false, 'invalid: expected { ok: false }.');
const expectedErrorKeys = [
  'name',
  'phone',
  'email',
  'location',
  'propertyType',
  serviceType === 'reconstruction' ? 'scope' : 'salePath',
  ...(serviceType === 'buyout' ? ['relationship'] : []),
  'privacyAcknowledged',
];
for (const key of expectedErrorKeys) {
  assert(typeof invalid.body?.errors?.[key] === 'string', `invalid: missing errors.${key}.`);
}

console.log('\nPASS: valid multipart, idempotent retry, and invalid-request validation all matched the contract.');
console.log(`Cleanup marker: ${qaMarker}`);
console.log(`Delete Firestore document: leads/${submissionId}`);
if (includePhoto) {
  console.log(`Also delete leadFiles records for submissionId=${submissionId} and Storage objects under lead-uploads/${first.body.leadId}/`);
}
