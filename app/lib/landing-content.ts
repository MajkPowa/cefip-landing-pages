export type ServiceType = 'reconstruction' | 'buyout';

export type HeadlinePair = {
  first: string;
  accent: string;
};

export type LandingContent = {
  serviceType: ServiceType;
  category: string;
  pageTitle: string;
  eyebrow: string;
  defaultHeadline: HeadlinePair;
  variantHeadlines: Record<string, HeadlinePair>;
  lead: string;
  heroPoints: string[];
  heroImage: string;
  heroImageAlt: string;
  primaryCta: string;
  formTitle: string;
  formIntro: string;
  proofLine: string;
  qualifier?: string;
  sectionEyebrow: string;
  sectionTitle: string;
  sectionText: string;
  services: { title: string; text: string }[];
  processTitle: string;
  process: { title: string; text: string }[];
  processNote: string;
  objectionTitle: string;
  objectionText: string;
  objectionImage: string;
  objectionImageAlt: string;
  reasons: { title: string; text: string }[];
  faqs: { question: string; answer: string }[];
  finalTitle: string;
  finalText: string;
};

export const reconstructionContent: LandingContent = {
  serviceType: 'reconstruction',
  category: 'REKONSTRUKCE',
  pageTitle: 'Kompletní rekonstrukce | CEFIP',
  eyebrow: 'REKONSTRUKCE BYTŮ, DOMŮ A BYTOVÝCH DOMŮ',
  defaultHeadline: {
    first: 'Kompletní rekonstrukce.',
    accent: 'Jeden koordinovaný postup.',
  },
  variantHeadlines: {
    r1: { first: 'Z původního stavu.', accent: 'Do nového prostoru.' },
    r2: { first: 'Nejdřív plán.', accent: 'Potom kladivo.' },
    r3: { first: 'Byt. Dům.', accent: 'Bytový dům.' },
    r4: { first: 'Jeden partner.', accent: 'Celá rekonstrukce.' },
    r5: { first: 'Pošlete lokalitu,', accent: 'fotky a rozsah.' },
  },
  lead:
    'Od prvního posouzení stavu po stavební a dokončovací práce. Pošlete základní informace a společně probereme vhodný další postup.',
  heroPoints: ['Byty, domy i bytové domy', 'Praha, střední a severní Čechy', 'Fotografie lze přiložit'],
  heroImage: '/assets/reconstruction-hero.webp',
  heroImageAlt: 'Ilustrační záběr plánování rekonstrukce',
  primaryCta: 'Poptat rekonstrukci',
  formTitle: 'Řekněte nám, co chcete změnit',
  formIntro: 'První krok zabere přibližně dvě minuty.',
  proofLine: 'Zkušenosti ve stavebnictví • vlastní technika • návaznost jednotlivých etap',
  sectionEyebrow: 'ROZSAH SLUŽBY',
  sectionTitle: 'Co lze zahrnout do realizace',
  sectionText: 'Konkrétní rozsah stanovíme podle typu, stavu a možností dané nemovitosti.',
  services: [
    { title: 'Příprava prostoru', text: 'Demontáže, odstranění povrchů a další přípravné práce.' },
    { title: 'Stavební části', text: 'Příčky, omítky, sádrokarton a související stavební úpravy.' },
    { title: 'Technické rozvody', text: 'Voda, odpady, topení a elektroinstalace podle rozsahu projektu.' },
    { title: 'Koupelny a povrchy', text: 'Obklady, dlažby, sanita, podlahy a povrchové úpravy.' },
    { title: 'Interiérové prvky', text: 'Dveře, kuchyňské sestavy a vybrané vestavěné prvky.' },
    { title: 'Dokončovací etapy', text: 'Malby, kompletace a uzavření dohodnutého rozsahu.' },
  ],
  processTitle: 'Od první informace k dokončenému prostoru',
  process: [
    { title: 'Pošlete základní údaje', text: 'Typ nemovitosti, lokalitu, záměr a ideálně fotografie současného stavu.' },
    { title: 'Doplníme podklady', text: 'Upřesníme zadání a podle projektu domluvíme konzultaci nebo prohlídku.' },
    { title: 'Stanovíme rozsah', text: 'Vyjasníme potřebné práce, podmínky a reálný další postup.' },
    { title: 'Realizace a dokončení', text: 'Práce proběhnou v odsouhlasené posloupnosti a dohodnutém rozsahu.' },
  ],
  processNote: 'Cena a harmonogram závisejí na stavu, rozsahu, materiálech a návaznostech jednotlivých profesí.',
  objectionTitle: 'Nemusíte mít hotový projekt ani přesný seznam prací.',
  objectionText:
    'Pro první posouzení stačí popsat současný stav, lokalitu a představu o výsledku. Potřebné podklady a návaznosti jednotlivých etap následně upřesníme.',
  objectionImage: '/assets/omni-reko-house.webp',
  objectionImageAlt: 'Rodinný dům během rekonstrukce',
  reasons: [
    { title: 'Široký rozsah prací', text: 'Přípravné, stavební i dokončovací etapy podle konkrétního projektu.' },
    { title: 'Jasné návaznosti', text: 'Jednotlivé kroky se plánují s ohledem na další profese a stav objektu.' },
    { title: 'Regionální působnost', text: 'Praha, střední a severní Čechy; dostupnost potvrdíme podle zakázky.' },
  ],
  faqs: [
    { question: 'Musím mít hotový projekt a přesný seznam prací?', answer: 'Nemusíte mít vše uzavřené. Pro první kontakt stačí typ nemovitosti, lokalita, popis záměru a ideálně fotografie. Další podklady upřesníme podle rozsahu.' },
    { question: 'Kolik bude rekonstrukce stát?', answer: 'Cena závisí na současném stavu, rozsahu, použitých materiálech a návaznostech profesí. Konkrétní návrh lze připravit až po doplnění podkladů a případné prohlídce.' },
    { question: 'Jak dlouho rekonstrukce potrvá?', answer: 'Délku ovlivňuje rozsah, dostupnost materiálů, nutné návaznosti a aktuální kapacita. Reálný harmonogram stanovíme po posouzení projektu a vzájemné dohodě.' },
    { question: 'Provádíte i částečné rekonstrukce?', answer: 'Vhodnost a rozsah konkrétní zakázky posuzujeme individuálně. Ve formuláři můžete uvést, zda jde o celkovou, částečnou nebo zatím neurčenou rekonstrukci.' },
    { question: 'Rekonstruujete také bytové a panelové domy?', answer: 'Ano. Konkrétní společné části, technické požadavky a rozsah ověříme podle daného objektu.' },
    { question: 'Kde působíte?', answer: 'Zaměřujeme se na Prahu, střední a severní Čechy. Do poptávky uveďte obec; dostupnost ověříme podle typu a rozsahu zakázky.' },
  ],
  finalTitle: 'Začněte lokalitou, fotografiemi a rozsahem.',
  finalText: 'Nemusíte mít všechny odpovědi. Pošlete to, co už víte, a probereme další krok.',
};

export const buyoutContent: LandingContent = {
  serviceType: 'buyout',
  category: 'PŘÍMÝ VÝKUP',
  pageTitle: 'Přímý výkup nemovitostí | CEFIP',
  eyebrow: 'PŘÍMÝ VÝKUP BYTŮ, DOMŮ A BYTOVÝCH DOMŮ',
  defaultHeadline: {
    first: 'Nejdřív fakta.',
    accent: 'Potom konkrétní nabídka.',
  },
  variantHeadlines: {
    v1: { first: 'Okamžitý výkup', accent: 'nemovitosti za hotové*' },
    v2: { first: 'Nejdřív fakta.', accent: 'Potom nabídka.' },
    v3: { first: 'Tři jasné kroky', accent: 'k posouzení výkupu.' },
    v4: { first: 'Běžný prodej,', accent: 'nebo přímý výkup?' },
    v5: { first: 'Nemovitost před rekonstrukcí?', accent: 'Pošlete informace.' },
  },
  lead:
    'Pošlete základní údaje o lokalitě, stavu a dostupných podkladech. Každou nemovitost posuzujeme individuálně a vysvětlíme možný další postup.',
  heroPoints: ['Právní a technické posouzení', 'Přímý výkup i běžný prodej', 'Fotografie lze přiložit'],
  heroImage: '/assets/buyout-hero.webp',
  heroImageAlt: 'Ilustrační vizuál domu a klíče',
  primaryCta: 'Požádat o posouzení',
  formTitle: 'Pošlete základní údaje k posouzení',
  formIntro: 'Odesláním nevzniká povinnost nemovitost prodat.',
  proofLine: 'Lokalita • technický stav • právní stav • dostupné podklady',
  qualifier:
    '*Možnost výkupu a jeho termín závisejí na individuálním právním a technickém posouzení a uzavření smlouvy. „Za hotové“ neznamená výplatu bankovek; kupní cena je hrazena bezhotovostně podle smluvních podmínek.',
  sectionEyebrow: 'TRANSPARENTNÍ POSTUP',
  sectionTitle: 'Pro první posouzení stačí několik údajů',
  sectionText: 'Nemusíte mít připravenou kompletní dokumentaci. Začněte typem, lokalitou a současným stavem.',
  services: [
    { title: 'Typ a lokalita', text: 'Byt, rodinný dům, bytový dům nebo jiná nemovitost a její obec.' },
    { title: 'Současný stav', text: 'Běžně užívaná nemovitost, stav před rekonstrukcí nebo rozestavěný objekt.' },
    { title: 'Právní souvislosti', text: 'Vztah k nemovitosti a dostupné informace důležité pro další prověření.' },
    { title: 'Dostupné podklady', text: 'Pro první kontakt stačí základní informace a volitelné fotografie.' },
    { title: 'Váš cíl', text: 'Přímý výkup, běžný prodej nebo nezávislé porovnání obou možností.' },
    { title: 'Další krok', text: 'Podklady doplníme pouze tehdy, pokud budou pro posouzení potřeba.' },
  ],
  processTitle: 'Jak posouzení přímého výkupu probíhá',
  process: [
    { title: 'Informace o nemovitosti', text: 'Pošlete typ, lokalitu, současný stav a dostupné fotografie.' },
    { title: 'Individuální posouzení', text: 'Prověříme dostupné informace a případně si vyžádáme další podklady nebo prohlídku.' },
    { title: 'Nabídka a vhodná cesta', text: 'Pokud je přímý výkup možný, obdržíte konkrétní nabídku a její podmínky.' },
    { title: 'Smlouva a předání', text: 'Teprve po vzájemné dohodě následuje dokumentace, převod a předání.' },
  ],
  processNote: 'Odeslání formuláře nezaručuje nabídku ani nezakládá povinnost nemovitost prodat nebo vykoupit.',
  objectionTitle: 'Technický stav nemusí bránit prvnímu kontaktu.',
  objectionText:
    'Nemovitost nemusíte nejprve opravovat. Pošlete aktuální fotografie a stručný popis. Stav bude součástí posouzení a může ovlivnit možnost výkupu i podmínky případné nabídky.',
  objectionImage: '/assets/property-inspection.webp',
  objectionImageAlt: 'Ilustrační kontrola nemovitosti před rekonstrukcí',
  reasons: [
    { title: 'Bez univerzálních slibů', text: 'Každá nemovitost, její stav a dostupné podklady se posuzují samostatně.' },
    { title: 'Dvě prodejní cesty', text: 'Podle cíle lze probrat přímý výkup i běžný prodej na trhu.' },
    { title: 'Jasné podmínky', text: 'Cena, termín a další kroky jsou součástí konkrétní nabídky a smlouvy.' },
  ],
  faqs: [
    { question: 'Dostanu nabídku vždy?', answer: 'Ne. Možnost přímého výkupu závisí na individuálním právním a technickém posouzení i dalších podmínkách. Pokud přímý výkup nebude vhodný, lze probrat jinou cestu prodeje.' },
    { question: 'Co znamená „okamžitý výkup“?', answer: 'Jde o přímou prodejní cestu bez běžného veřejného hledání kupujícího. Není to garance nabídky, převodu nebo platby v pevné lhůtě.' },
    { question: 'Co znamená „za hotové“?', answer: 'Neznamená to předání kupní ceny v bankovkách. Kupní cena se hradí bezhotovostně podle uzavřené smlouvy.' },
    { question: 'Podle čeho se připravuje nabídka?', answer: 'Posuzuje se zejména lokalita, typ, právní a technický stav, užívání nemovitosti a dostupné podklady.' },
    { question: 'Lze posoudit nemovitost v horším stavu?', answer: 'Ano, informace můžete poslat i bez předchozí rekonstrukce. Stav ale ovlivní výsledek posouzení a případné podmínky nabídky.' },
    { question: 'Jaké dokumenty mám poslat?', answer: 'Pro začátek stačí základní údaje a fotografie. Občanský průkaz, rodné číslo ani jiné nepotřebné citlivé dokumenty přes formulář neposílejte.' },
    { question: 'Kdy dostanu peníze?', answer: 'Termín úhrady nelze obecně slíbit. Závisí na dohodnutých podmínkách, podpisu smluv a splnění kroků uvedených ve smluvní dokumentaci.' },
  ],
  finalTitle: 'Začněte tím, co o nemovitosti víte.',
  finalText: 'Pošlete základní informace. Možnosti a další postup vysvětlíme podle konkrétního případu.',
};
