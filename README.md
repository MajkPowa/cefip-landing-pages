# CEFIP — landing pages pro Meta kampaně

Dvě konverzní landing pages pro kampaně CEFIP:

- kompletní rekonstrukce bytů, domů a bytových domů,
- individuálně posuzovaný přímý výkup nemovitostí.

## Veřejné náhledy

- [Rozcestník](https://majkpowa.github.io/cefip-landing-pages/)
- [Rekonstrukce](https://majkpowa.github.io/cefip-landing-pages/rekonstrukce/)
- [Výkup nemovitostí](https://majkpowa.github.io/cefip-landing-pages/vykup-nemovitosti/)

GitHub Pages obsahuje pouze statický náhled. Formuláře jsou v něm záměrně vypnuté. Plná serverová verze ukládá leady do D1 a volitelné fotografie do R2.

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

## Trasy

- `/rekonstrukce`
- `/vykup-nemovitosti`
- `/dekujeme`
- `/ochrana-osobnich-udaju`
- `/api/leads`

Variantní H1 lze sladit s reklamní kreativou pomocí `?v=r1` až `?v=r5` nebo `?v=v1` až `?v=v5`.

## Produkční konfigurace

- `NEXT_PUBLIC_META_PIXEL_ID` — Meta Pixel se načte až po marketingovém souhlasu.
- D1 binding `DB` — uložení leadů.
- R2 binding `FILES` — volitelné fotografie k poptávce.

Repozitář neobsahuje API klíče, přístupové tokeny, lokální testovací data ani instalované závislosti.
