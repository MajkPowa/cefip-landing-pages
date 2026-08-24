import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Ochrana osobních údajů | CEFIP',
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <header className="site-header">
        <Link className="brand" href="/"><img src="/assets/cefip-logo-white.png" alt="CEFIP" /></Link>
        <a className="header-phone" href="mailto:info@cefip.cz">info@cefip.cz</a>
      </header>
      <article>
        <p className="legal-eyebrow">INFORMACE PRO ZÁJEMCE O SLUŽBY</p>
        <h1>Ochrana osobních údajů</h1>
        <p>Tyto informace se vztahují k poptávkovým formulářům pro rekonstrukce a realitní služby CEFIP. Nejde o náhradu kompletní interní dokumentace společnosti.</p>

        <h2>Kdo údaje zpracovává</h2>
        <p>Pro poptávky rekonstrukcí je správcem CEFIP s.r.o., IČ 05432057. Pro poptávky realitních služeb je správcem CEFIP REALITY s.r.o., IČ 23881101. Obě společnosti mají adresu Svobody 282, 417 05 Osek. Kontakt: <a href="mailto:info@cefip.cz">info@cefip.cz</a>, <a href="tel:+420730535775">+420 730 535 775</a>.</p>

        <h2>Jaké údaje a proč používáme</h2>
        <p>Zpracováváme údaje, které vyplníte do formuláře: kontakt, lokalitu a informace o nemovitosti nebo zamýšlené rekonstrukci. Údaje používáme k vyřízení poptávky, navazující komunikaci a přípravě možného smluvního vztahu. Odeslání formuláře není marketingovým souhlasem.</p>

        <h2>Fotografie</h2>
        <p>Fotografie jsou volitelné a slouží pouze k prvotnímu posouzení poptávky. Nenahrávejte občanský průkaz, rodné číslo, smlouvy ani jiné nepotřebné citlivé dokumenty. Před nahráním odstraňte fotografie osob nebo jiné informace, které nejsou pro poptávku nutné.</p>

        <h2>Doba uložení</h2>
        <p>Neaktivní poptávky a související podklady jsou určeny k výmazu nejpozději do 12 měsíců od poslední komunikace, pokud právní předpis nebo vzniklý smluvní vztah nevyžaduje delší dobu. Tento retenční rámec musí být před ostrým spuštěním potvrzen odpovědnou osobou CEFIP.</p>

        <h2>Komu mohou být údaje zpřístupněny</h2>
        <p>Údaje mohou zpracovávat pověření pracovníci CEFIP a poskytovatelé technické infrastruktury v rozsahu nutném pro provoz formuláře. Kontaktní údaje, fotografie ani popis nemovitosti neposíláme do Meta Pixelu.</p>

        <h2>Marketingové technologie</h2>
        <p>Meta Pixel a navazující serverové měření Meta Conversions API aktivujeme pouze po aktivním souhlasu v cookie liště. Pro měření odesíláme typ a čas události, identifikátor pro deduplikaci, navštívenou stránku, technické údaje prohlížeče a s reklamou související identifikátory Meta. Do Meta neposíláme jméno, telefon, e-mail, fotografie ani popis nemovitosti. Odmítnutí marketingových cookies nebrání odeslání poptávky. Souhlas lze později odvolat vymazáním uloženého nastavení webu v prohlížeči.</p>

        <h2>Vaše práva</h2>
        <p>Můžete požádat o přístup k údajům, opravu, výmaz, omezení zpracování nebo vznést námitku, pokud jsou splněny zákonné podmínky. Kontaktujte <a href="mailto:info@cefip.cz">info@cefip.cz</a>. Máte také právo podat stížnost u Úřadu pro ochranu osobních údajů.</p>

        <p className="legal-note"><strong>Verze 1.0 — 24. 8. 2026.</strong> Před veřejným reklamním spuštěním musí text schválit odpovědná osoba nebo právní zástupce CEFIP.</p>
      </article>
    </main>
  );
}
