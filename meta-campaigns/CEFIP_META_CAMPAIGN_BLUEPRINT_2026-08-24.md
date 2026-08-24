# CEFIP — produkční blueprint kampaní Meta

Datum: 24. 8. 2026  
Režim přípravy: všechny kampaně, sady reklam a reklamy vytvořit jako `VYPNUTO / PAUSED`.  
Nikdy nezapínat doručování ani útratu bez samostatného potvrzení rozpočtu.

## Ověřené položky Meta

- Business portfolio: `Cefip` (`1754407605947820`)
- Reklamní účet: `Cefip - 1` (`2596685627375368`)
- Facebook stránka CEFIP Realitní: `943869282146180`
- Facebook stránka CEFIP Stavební: `977542792103554`
- Instagram identity nejsou dostupné přes autorizovaný reklamní účet ani přes obě Facebook stránky; do reklam se neposílá žádný `instagram_actor_id`
- Dataset / Meta Pixel: `Cefip` (`1511661883235296`), přijímá události a je připojen k reklamnímu účtu
- Oficiální Meta Ads MCP endpoint: `https://mcp.facebook.com/ads`
- Oprávnění Meta Ads MCP u účtu `Cefip - 1`: 7/7 akcí povoleno

## Blokátory před zveřejněním

1. V Přehledu účtu doplnit platební metodu.
2. Ověřit telefonní číslo reklamního účtu.
3. Potvrdit výběr Facebook stránky pro první reklamu.
4. Kampaně připravit s bezpečným `PAGE_BACKED` fallbackem. Pokud bude později připojen Instagram účet, před změnou identity jej ověřit a schválit.
5. Přidat a ověřit vlastní doménu. V Business Manageru nyní není žádná doména. Pro ostré kampaně je vhodné napojit například `kampane.cefip.cz` na Firebase Hosting a ověřit `cefip.cz`; cizí doménu `web.app` nelze vlastnit ani ověřit za CEFIP.
6. Odpovědná osoba CEFIP musí před spuštěním potvrdit pravdivost claimů „okamžitý výkup“, „za hotové“ a případně „z vlastních prostředků“. Kupní cena je na landing page výslovně popsána jako bezhotovostní.
7. Schválit text ochrany osobních údajů a 12měsíční retenční rámec.

## Společné nastavení

- Nákup: aukce
- Cíl: Potenciální zákazníci / Leads
- Zvláštní kategorie reklamy: Bydlení / Housing
- Místo konverze: Web
- Cíl výkonu: maximalizovat počet konverzí
- Dataset: `1511661883235296`
- Událost: `Lead`
- Nabídka: nejvyšší objem, bez cost capu v prvním testu
- Atribuce: výchozí 7denní kliknutí + 1denní zobrazení; reportovat navíc click-only pohled
- Umístění: Advantage+ placements
- Lokalita: lidé žijící v dané lokalitě; Česko; městské okruhy Praha, Kladno, Mělník, Mladá Boleslav, Ústí nad Labem, Teplice, Liberec a Jablonec nad Nisou. U kategorie Bydlení přijmout minimální radius, který Meta v účtu vynutí.
- Věk a pohlaví: bez zužování; u kategorie Bydlení ponechat 18–65+ a všechna pohlaví
- Jazyk: neomezovat, aby se nevyloučili uživatelé s jiným jazykem rozhraní žijící v regionu
- Detailní cílení: žádné; široké publikum
- Vyloučení: existující `Lead` 180 dní, jakmile bude vlastní publikum dostupné a dostatečně naplněné
- Optimalizace kreativy: nepovolit AI přepis hlavních claimů ani automatické rozšíření obrazu u právně kvalifikovaných textů; automatický ořez lze použít jen po náhledu všech umístění

### Doporučený testovací rozpočet

- Pilot: `400 Kč / den / kampaň` — přibližně 24 000 Kč za 30 dní celkem
- Doporučeno: `750 Kč / den / kampaň` — přibližně 45 000 Kč za 30 dní celkem
- Růst: `1 200 Kč / den / kampaň` — přibližně 72 000 Kč za 30 dní celkem

Do vypnutých konceptů připravit `750 Kč / den / kampaň`. Aktivace a skutečný rozpočet vyžadují samostatné potvrzení.

## Kampaň 1 — CEFIP Stavební

Název kampaně: `CEFIP | STAVEBNI | LEADS-WEB | PRAHA-SEVER | 2026-09`  
Název sady: `PROSPECTING | HOUSING | BROAD | PRAHA-SEVER | AUTO`  
Facebook identita: `CEFIP Stavební` (`977542792103554`)  
Instagram umístění: page-backed identita z Facebook stránky; žádný `instagram_actor_id`
Landing page: `https://cefip-landing-pages-2026.web.app/rekonstrukce/`

URL parametry:

```text
utm_source=meta&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}&campaign_id={{campaign.id}}&adset_id={{adset.id}}&ad_id={{ad.id}}&placement={{placement}}
```

### Reklamy

| Název reklamy | Stav při přípravě | Varianta LP | Primární text | Headline | CTA | Kreativy |
|---|---|---|---|---|---|---|
| `R1 | TRANSFORMACE | STATIC` | vypnuto | `?v=r1` | Plánujete rekonstrukci bytu, domu nebo bytového domu? Pošlete nám základní informace a společně probereme vhodný postup. | Poptat rekonstrukci | Další informace | `r1-transformace-pred-po-4x5.png`; `r1-transformace-pred-po-9x16.png` |
| `R2 | PLAN | STATIC` | vypnuto | `?v=r2` | Dobrý výsledek začíná správně nastaveným rozsahem. Probereme stav nemovitosti, návaznosti prací i další postup. | Probrat rozsah projektu | Další informace | `r2-nejdriv-plan-4x5.png`; `r2-nejdriv-plan-9x16.png` |
| `R3 | TYP-NEMOVITOSTI | STATIC` | vypnuto | `?v=r3` | Rozsah rekonstrukce se liší podle typu i stavu nemovitosti. Napište nám, co chcete změnit, a probereme možnosti realizace. | Rekonstrukce nemovitosti | Další informace | `r3-byt-dum-bytovy-dum-4x5.png`; `r3-byt-dum-bytovy-dum-9x16.png` |
| `R4 | JEDEN-PARTNER | STATIC` | vypnuto | `?v=r4` | Méně předávání mezi jednotlivými etapami, jasnější návaznosti a jeden koordinovaný postup. Začněte konzultací projektu. | Jeden partner pro projekt | Kontaktujte nás | `r4-jeden-partner-4x5.png`; `r4-jeden-partner-9x16.png` |
| `R5 | LOW-FRICTION | STATIC` | vypnuto | `?v=r5` | Pro první konzultaci stačí popsat lokalitu, přiložit fotografie současného stavu a uvést zamýšlený rozsah. Ozveme se s dalším postupem. | Začněte konzultací | Kontaktujte nás | `r5-poslete-lokalitu-fotky-rozsah-4x5.png`; `r5-poslete-lokalitu-fotky-rozsah-9x16.png` |
| `RV1 | KOMPLETNI-REKONSTRUKCE | VIDEO-27S` | vypnuto | výchozí | Byt, rodinný dům nebo bytový dům. Rekonstrukce začíná jasným plánem a koordinací jednotlivých etap. Pošlete základní údaje a probereme vhodný postup. | Poptat rekonstrukci | Další informace | `CEFIP-kompletni-rekonstrukce-27s-1080x1920.mp4` |

První test po schválení: zapnout pouze R1, R2, R5 a RV1. R3 a R4 ponechat jako vypnuté challengery.

## Kampaň 2 — CEFIP Realitní

Název kampaně: `CEFIP | REALITNI | LEADS-WEB | PRAHA-SEVER | 2026-09`  
Název sady: `PROSPECTING | HOUSING | BROAD | PRAHA-SEVER | AUTO`  
Facebook identita: `CEFIP Realitní` (`943869282146180`)  
Instagram umístění: page-backed identita z Facebook stránky; žádný `instagram_actor_id`
Landing page: `https://cefip-landing-pages-2026.web.app/vykup-nemovitosti/`

URL parametry jsou stejné jako u stavební kampaně.

### Reklamy

| Název reklamy | Stav při přípravě | Varianta LP | Primární text | Headline | CTA | Kreativy |
|---|---|---|---|---|---|---|
| `V1 | OKAMZITY-VYKUP | STATIC | CLAIM-GATE` | vypnuto | `?v=v1` | Zvažujete přímý výkup nemovitosti? Pošlete nám základní informace o lokalitě a stavu. Každý případ posuzujeme individuálně. | Požádat o posouzení | Další informace | `v1-okamzity-vykup-za-hotove-4x5.png`; `v1-okamzity-vykup-za-hotove-9x16.png` |
| `V2 | FAKTA | STATIC` | vypnuto | `?v=v2` | Pro první posouzení jsou důležité základní informace o nemovitosti, její lokalitě, stavu a dostupných podkladech. | Zjistit možnosti výkupu | Další informace | `v2-nejdriv-fakta-4x5.png`; `v2-nejdriv-fakta-9x16.png` |
| `V3 | TRI-KROKY | STATIC` | vypnuto | `?v=v3` | Pošlete základní informace, nemovitost individuálně posoudíme a vysvětlíme další možný postup. | Odeslat základní údaje | Kontaktujte nás | `v3-tri-jasne-kroky-4x5.png`; `v3-tri-jasne-kroky-9x16.png` |
| `V4 | POROVNANI-CEST | STATIC` | vypnuto | `?v=v4` | Běžný prodej a přímý výkup jsou dvě různé cesty. Pomůžeme vám porovnat možnosti podle konkrétní nemovitosti a cíle. | Porovnat možnosti prodeje | Další informace | `v4-bezny-prodej-nebo-vykup-4x5.png`; `v4-bezny-prodej-nebo-vykup-9x16.png` |
| `V5 | PRED-REKONSTRUKCI | STATIC` | vypnuto | `?v=v5` | Horší technický stav nemusí být důvodem první kontakt odkládat. Pošlete dostupné informace a fotografie; možnosti posoudíme individuálně. | Poslat informace | Kontaktujte nás | `v5-nemovitost-pred-rekonstrukci-4x5.png`; `v5-nemovitost-pred-rekonstrukci-9x16.png` |
| `VV1 | OKAMZITY-VYKUP | VIDEO-27S | CLAIM-GATE` | vypnuto | `?v=v1` | Zvažujete přímý výkup nemovitosti? Začněte lokalitou, stavem a dostupnými podklady. Možnost výkupu, nabídka i termín vždy závisejí na individuálním posouzení a smlouvě. | Požádat o posouzení | Další informace | `CEFIP-okamzity-vykup-za-hotove-27s-1080x1920.mp4` |

První bezpečný test po schválení: V2, V4, V5. V1 a VV1 zapnout jen po výslovném claim approval; V3 ponechat jako challenger.

## Umístění souborů v pracovním balíčku

- Statiky 4:5 a 9:16: `CEFIP_Meta_Static_Creatives_2026/final/`
- Hotová 27s videa: `CEFIP_Omni_Complete_Videos_2026/final/`
- Copy deck: `CEFIP_Meta_Static_Creatives_2026/COPY_DECK.md`
- Landing pages: `CEFIP_Landing_Pages_2026/`

## Vyhodnocení

- Primární KPI: validní lead, cena za validní lead, podíl dosažitelných kontaktů, podíl leadů splňujících region a typ zakázky.
- Sekundární KPI: návštěva landing page, zahájení formuláře, dokončení formuláře, poměr `Lead / LeadFormStart`, CTR odkazu a CPC.
- Kvalitu vyhodnocovat odděleně podle `serviceType`, `landingVariant`, `utm_content`, `campaign_id`, `adset_id`, `ad_id` a `placement` uložených ve Firebase.
- První rozhodnutí o kreativě nejdříve po prakticky použitelné návštěvnosti; neukončovat variantu jen podle několika kliknutí.
- Rozpočet škálovat postupně, typicky po 15–25 %, pokud kvalita leadů zůstává stabilní.

## Bezpečné tokeny a integrace

- Pro správu kampaní použít přednostně oficiální OAuth propojení Meta Ads MCP (`https://mcp.facebook.com/ads`). Token se nemá kopírovat do chatu, repozitáře ani dokumentace.
- Ruční Marketing API/System User token vytvářet jen tehdy, pokud bude potřeba serverová automatizace nebo Conversions API. Minimální rozsah: `ads_management`, `ads_read`, `business_management`; oprávnění ke stránkám přidat jen podle reálné potřeby.
- Conversions API token uložit jako tajný parametr Firebase/Google Secret Manageru, nikoli jako `NEXT_PUBLIC_*` proměnnou. Browser Pixel ID je veřejné a může být v klientském buildu.
- Každý serverový `Lead` musí používat stejné `event_id` jako browserový `Lead`, aby Meta mohla události deduplikovat.

