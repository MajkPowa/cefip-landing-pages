# CEFIP Meta Ads – stav nasazení 2026-08-24

## Vytvořeno v Meta

- Business Portfolio: `Cefip` (`1754407605947820`)
- Reklamní účet: `Cefip - 1` (`2596685627375368`), CZK
- Dataset/pixel: `Cefip` (`1511661883235296`)
- 2 kampaně ve stavu `PAUSED`, každá s rozpočtem 750 Kč/den
- 2 sady reklam ve stavu `PAUSED`
- 12 kreativ: 10 statických variant a 2 videa
- 12/12 reklam je připraveno v Ads Manageru jako nezveřejněné UI koncepty
- 0/12 zveřejněných ad objektů; nevznikla žádná útrata

| Větev | Campaign ID | Ad set ID | Kreativy | Reklamy |
|---|---:|---:|---:|---:|
| CEFIP Stavební | `120250595080590433` | `120250595111560433` | 6/6 | 6/6 UI konceptů, 0 zveřejněných |
| CEFIP Realitní | `120250595134460433` | `120250595134750433` | 6/6 | 6/6 UI konceptů, 0 zveřejněných |

Aktivní lokální checkpoint je `meta-campaigns/.meta-ads-checkpoint.json`. Původní před-DSA checkpoint je zachovaný jako `meta-campaigns/.meta-ads-checkpoint-pre-dsa.json`. Oba soubory jsou úmyslně mimo Git a neobsahují access token.

## Nastavení kompatibility a compliance

- Special Ad Category: `HOUSING`
- 8 cílových měst, každé s Meta-minimem 17 km
- DSA beneficiary/payor:
  - Stavební: `CEFIP s.r.o.`
  - Realitní: `CEFIP REALITY s.r.o.`
- Instagram účty nejsou k Page/Ad Account připojené; kreativy proto používají podporovanou Page-backed identitu bez cizího Instagram ID.
- Zastaralé souhrnné pole `standard_enhancements` není do API v25.0 posíláno.
- Kampaně, sady i budoucí ad objekty jsou v deployeru natvrdo omezené na `PAUSED`.

Před aktivací potvrďte, že uvedená DSA právnická osoba odpovídá skutečnému plátci dané kampaně.

## Aktuální blokátor

Meta odmítla vytvoření prvního pozastaveného ad objektu:

- code `100`, subcode `1359188`
- „Žádný způsob platby“ / účet potřebuje platnou platební metodu

Následné ověření narazilo na dočasný request limit účtu (code `17`, subcode `2446079`). Před pokračováním nechte API krátce vychladnout.

## Ads Manager koncepty – aktualizace 2026-08-25

- Ads Manager potvrzuje `Zkontrolovat a zveřejnit (12)` a `Výsledky z 12 reklam`.
- Všechny reklamy jsou pouze nezveřejněné koncepty; tlačítko `Zveřejnit` nebylo použito.
- Každá statická reklama má vlastní výchozí kreativu 4:5 a vlastní vertikální kreativu 9:16.
- Obě video reklamy mají odpovídající 27s video nastavené i pro Stories a Reels.
- CEFIP Realitní používá Page-backed identitu `CEFIP Realitní`; CEFIP Stavební používá `CEFIP Stavební` a připojený profil `cefipstavebni`.
- Landing URL, texty, titulky, CTA a UTM parametry jsou vyplněné. Popis zůstává úmyslně prázdný.
- UI koncepty nejsou totéž co Graph API ad objekty, proto checkpoint nadále správně eviduje `ads: {}`.

## Bezpečné pokračování

1. Nyní nic nezveřejňovat a nepřidávat platební metodu, dokud nebude schválen finální go-live.
2. Před pozdějším zveřejněním ověřit stav `PAUSED` / vypnuto na úrovni kampaně, sady reklam i každé reklamy.
3. Poté přidat v Billing & Payments k účtu `Cefip - 1` platnou platební metodu.
4. Použít jednu cestu nasazení: buď zveřejnit připravených 12 UI konceptů, nebo je nejprve zahodit a teprve potom použít API deployer. Nekombinovat obě cesty, jinak vzniknou duplicity.
5. Varianty `V1` a `VV1` ponechat vypnuté i při pozdějším testu, dokud nebude výslovně schválen claim „okamžitý výkup / za hotové“.

Ads Manager: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=2596685627375368&business_id=1754407605947820
