# CEFIP — landing pages pro Meta kampaně

Dvě konverzní landing pages pro kampaně CEFIP:

- kompletní rekonstrukce bytů, domů a bytových domů,
- individuálně posuzovaný přímý výkup nemovitostí.

## Veřejné adresy

Firebase Hosting po produkčním nasazení:

- [Rozcestník](https://cefip-landing-pages-2026.web.app/)
- [Rekonstrukce](https://cefip-landing-pages-2026.web.app/rekonstrukce/)
- [Výkup nemovitostí](https://cefip-landing-pages-2026.web.app/vykup-nemovitosti/)

Původní GitHub Pages náhled zůstává dostupný:

- [Rozcestník](https://majkpowa.github.io/cefip-landing-pages/)
- [Rekonstrukce](https://majkpowa.github.io/cefip-landing-pages/rekonstrukce/)
- [Výkup nemovitostí](https://majkpowa.github.io/cefip-landing-pages/vykup-nemovitosti/)

GitHub Pages obsahuje pouze prezentační náhled. Formuláře jsou v něm záměrně vypnuté. Produkční Firebase Hosting směruje `/api/leads` na Cloud Function `submitLead`, která ukládá leady do Cloud Firestore a volitelné fotografie do privátního Cloud Storage bucketu.

## Lokální vývoj

Požadovaný Node.js: 22.13 nebo novější.

```bash
npm ci
npm run dev
```

Produkční sestavení:

```bash
npm run build
```

Standardní Next.js export vznikne v adresáři `out/`, který je zdrojem pro Firebase Hosting. Původní Vinext build pro údržbu GitHub Pages náhledu je zachovaný jako `npm run build:vinext`; náhledový skript zůstává `npm run preview:github`.

Lokální kontrola samotného exportu přes Firebase Hosting emulator:

```bash
npm run build
npm run preview:firebase
```

## Trasy

- `/rekonstrukce`
- `/vykup-nemovitosti`
- `/dekujeme`
- `/ochrana-osobnich-udaju`
- `/api/leads`

Variantní H1 lze sladit s reklamní kreativou pomocí `?v=r1` až `?v=r5` nebo `?v=v1` až `?v=v5`.

## Produkční konfigurace

- Firebase projekt: `cefip-landing-pages-2026`.
- Hosting publikuje obsah adresáře `out/`.
- Rewrite `/api/leads` míří na 2nd gen Function `submitLead` v `europe-west1`.
- Cloud Firestore ukládá leady; Cloud Storage ukládá volitelné fotografie.
- `firestore.rules` a `storage.rules` zakazují veškerý přímý klientský přístup. Přístup produkční funkce řídí IAM přes Firebase Admin SDK.
- Firestore TTL maže leady podle `expiresAt`; `storage-lifecycle.json` maže fotografie v `lead-uploads/` po 365 dnech.
- `NEXT_PUBLIC_META_PIXEL_ID` je volitelný build-time parametr; Meta Pixel se načte až po marketingovém souhlasu.

Cloud Functions a Cloud Storage vyžadují tarif Blaze. Funkce má kvůli kontrole nákladů nastavený limit tří souběžných instancí; rozpočtová upozornění lze doplnit podle provozního rozpočtu CEFIP. Existující Firestore databáze je v neměnné evropské multi-region lokaci `eur3`; Storage bucket a Function jsou v `europe-west1`, což je pro `eur3` doporučená nejbližší Functions oblast.

První lokální kontrola celé Firebase sestavy:

```bash
npx firebase-tools@15.7.0 emulators:start --only hosting,functions,firestore,storage
```

Produkční nasazení všech souvisejících prostředků:

```bash
npm run build
npm run deploy:firebase
```

Retenční politiku nového projektu aktivujte jednorázově:

```bash
gcloud firestore fields ttls update expiresAt --collection-group=leads --database="(default)" --enable-ttl --project cefip-landing-pages-2026
gcloud storage buckets update gs://cefip-landing-pages-2026.firebasestorage.app --lifecycle-file=storage-lifecycle.json
```

Před prvním produkčním nasazením musí v cílovém projektu existovat Firestore databáze, Cloud Storage bucket a implementace `functions/` se jménem exportu `submitLead`. Výstup `out/`, lokální data emulátorů a soubory `.env*` se necommitují.

Repozitář neobsahuje API klíče, přístupové tokeny, lokální testovací data ani instalované závislosti.
