# CEFIP lead function

Firebase Functions 2nd gen backend for the public CEFIP lead form.

## Export

- Function: `submitLead`
- Region: `europe-west1`
- Method: `POST multipart/form-data`
- Intended public path through Firebase Hosting rewrite: `/api/leads`

The frontend contract matches the existing API: success is HTTP 201 with `leadId`, `eventId`, `uploaded` and `uploadWarning`. Validation errors are HTTP 422 with an `errors` object.

## Build and test

```bash
npm ci
npm test
```

## Firebase configuration

The function uses Application Default Credentials and the default Firestore database and Storage bucket. Do not deploy a service-account key. If a non-default bucket is required, set `CEFIP_STORAGE_BUCKET` to its bucket name.

For same-origin form submissions, rewrite `/api/leads` to `submitLead` in the root `firebase.json`. Direct cross-origin calls are rejected unless their exact origins are listed as a comma-separated `CEFIP_ALLOWED_ORIGINS` runtime variable.

Deploy the deny-all rules from `firestore.rules` and `storage.rules`; all writes happen through the Admin SDK. The function creates an `expiresAt` timestamp one year after submission, but Firestore TTL and a matching Storage lifecycle or cleanup job must still be enabled in the Firebase project.
