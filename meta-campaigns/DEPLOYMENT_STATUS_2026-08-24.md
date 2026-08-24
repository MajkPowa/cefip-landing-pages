# CEFIP Meta Ads – stav nasazení 2026-08-24

## Vytvořeno v Meta

- Business Portfolio: `Cefip` (`1754407605947820`)
- Reklamní účet: `Cefip - 1` (`2596685627375368`), CZK
- Dataset/pixel: `Cefip` (`1511661883235296`)
- 2 kampaně ve stavu `PAUSED`, každá s rozpočtem 750 Kč/den
- 2 sady reklam ve stavu `PAUSED`
- 12 kreativ: 10 statických variant a 2 videa
- 0/12 ad objektů; nevznikla žádná útrata

| Větev | Campaign ID | Ad set ID | Kreativy | Reklamy |
|---|---:|---:|---:|---:|
| CEFIP Stavební | `120250595080590433` | `120250595111560433` | 6/6 | 0/6 |
| CEFIP Realitní | `120250595134460433` | `120250595134750433` | 6/6 | 0/6 |

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

## Bezpečné pokračování

1. V Billing & Payments přidejte k účtu `Cefip - 1` platnou platební metodu.
2. Vygenerujte nový krátkodobý user token s oprávněními uvedenými v README a pouze pro portfolio Cefip + dvě CEFIP stránky.
3. Z kořene projektu spusťte:

   ```powershell
   Get-Clipboard | node meta-campaigns/deploy-meta-ads.mjs --execute --token-stdin
   Set-Clipboard -Value $null
   ```

Deployer naváže z checkpointu, nepřehraje existující kampaně/sady/kreativy a vytvoří pouze chybějících 12 `PAUSED` ad objektů. Aktivace není součástí tohoto kroku.

Ads Manager: https://adsmanager.facebook.com/adsmanager/manage/campaigns?act=2596685627375368&business_id=1754407605947820
