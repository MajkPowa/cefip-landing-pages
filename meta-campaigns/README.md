# Bezpečné nasazení kampaní CEFIP do Meta Ads

Skript `deploy-meta-ads.mjs` převádí `campaign-plan.json` do dvou kampaní, dvou sad a dvanácti reklam. Používá oficiální Meta Graph Marketing API přímo, bez další SDK vrstvy. Všechny tři úrovně se vždy vytvoří jako `PAUSED`; skript nemá parametr pro aktivaci.

## Nejdřív vždy dry-run

```powershell
npm run meta:validate
npm run test:meta
```

Dry-run je výchozí, nepotřebuje token, nedělá síťová volání a nic nezapisuje. Ověří:

- přesně 2 kampaně, 2 sady a 12 reklam;
- stav `PAUSED` na všech reklamách a režim `PAUSED_DRAFT_ONLY`;
- kategorii `HOUSING`, zemi zvláštní kategorie `CZ`, webový `Lead` a dataset `1511661883235296`;
- rozpočet 750 Kč/den na každé kampani (Meta hodnota `75000` v haléřích);
- osm lokalit, široké publikum od 18 let a automatická umístění;
- všech 20 placement obrazů (4:5 + 9:16) a obě videa na disku.

## Token a oprávnění

Doporučený je krátkodobý vstup ze schránky přes stdin. Token se nedává do argumentu, souboru, checkpointu ani logu:

```powershell
Get-Clipboard | node meta-campaigns/deploy-meta-ads.mjs --execute --token-stdin
Set-Clipboard -Value $null
```

Clipboard vyčistěte i tehdy, když příkaz skončí chybou. Alternativní fallback je procesní proměnná `META_ADS_ACCESS_TOKEN`; po procesu ji odstraňte. Když je zároveň použito `--token-stdin` i proměnná prostředí, skript skončí bez API volání. Token v CLI argumentu není podporován.

Preflight kontroluje přes `/me/permissions` tato udělená oprávnění:

- `ads_management` a `ads_read`;
- `business_management`;
- `pages_show_list`, `pages_read_engagement` a `pages_manage_ads`;
- `instagram_basic`.

Uživatel nebo system user musí mít odpovídající přístup k business portfoliu `1754407605947820`, účtu `2596685627375368`, oběma stránkám, jejich Instagram účtům a datasetu. Aplikace může pro ostrý/system-user token potřebovat Advanced Access a ověření firmy. `leads_retrieval` není pro tvorbu těchto webových reklam potřeba a skript ho nepoužívá.

Preflight navíc ověří účet, měnu CZK, business portfolio, dostupnost datasetu a přes mapování `Facebook Page → instagram_business_account` oba Instagram účty. Pokud například `instagram_basic` nebo propojení účtu chybí, skript skončí ještě před vytvořením kampaně.

## Výslovné vytvoření PAUSED draftů

Mutace se povolí pouze parametrem `--execute` a platným tokenem:

```powershell
node meta-campaigns/deploy-meta-ads.mjs --execute
```

Graph API verze je v tomto pořadí konfigurovatelná přes `--api-version`, `META_GRAPH_VERSION`, `meta.graphVersion` v plánu a nakonec výchozí `v25.0`:

```powershell
Get-Clipboard | node meta-campaigns/deploy-meta-ads.mjs --execute --token-stdin --api-version v25.0
Set-Clipboard -Value $null
```

Skript nejprve provede pouze čtecí preflight a vyřeší Meta geo klíče měst. Teprve po úspěchu začne vytvářet:

1. dvě `PAUSED` kampaně s campaign budgetem 750 Kč/den;
2. jednu `PAUSED` webovou lead sadu v každé kampani;
3. pro každou statiku oba obrazy a placement asset customization;
4. obě videa, včetně čekání na jejich zpracování;
5. kreativy s automatickými creative enhancements vypnutými;
6. všech 12 reklam jako `PAUSED`.

V1 a VV1 jsou claim-gated, ale skript je smí pouze připravit vypnuté. Před jejich případnou aktivací je nutné samostatné schválení claimů. Aktivace, přidání platební metody ani změna účtových nastavení nejsou součástí skriptu.

## Checkpoint a pokračování

Výchozí checkpoint je `meta-campaigns/.meta-ads-checkpoint.json` a je ignorovaný Gitem. Neobsahuje token, pouze ID vytvořených Meta objektů, hashe uploadů, vyřešené lokality a otisk plánu. Zapisuje se po každém úspěšném kroku.

Stejný příkaz bezpečně pokračuje z checkpointu. Každou uloženou kampaň, sadu i reklamu před použitím znovu ověří jako `PAUSED`. Pokud se liší plán, Graph verze či účet, skript skončí a doporučí nový explicitní `--checkpoint`. Nikdy automaticky nepřebírá aktivní objekt. Při ztrátě lokálního checkpointu umí podle přesného názvu konzervativně převzít jedinou odpovídající `PAUSED` kampaň, sadu nebo reklamu; duplicita či nesoulad běh zastaví.

Příklad odděleného checkpointu:

```powershell
Get-Clipboard | node meta-campaigns/deploy-meta-ads.mjs --execute --token-stdin --checkpoint meta-campaigns/cefip-v25.checkpoint.json
Set-Clipboard -Value $null
```

## Známé účtové blokátory před publikací

V Business/Ads Manageru mohou být stále nutné platební metoda, ověření telefonu, potvrzení Facebook stránky, dokončené přihlášení/propojení Instagramů a ověřená vlastní doména. Skript některé z nich může odhalit jako API chybu, ale záměrně je neopravuje a nikdy reklamy neaktivuje.

