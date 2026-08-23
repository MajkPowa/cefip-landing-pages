import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Děkujeme za poptávku | CEFIP',
  robots: { index: false, follow: false },
};

export default function ThankYouPage() {
  return (
    <main className="thank-you-page">
      <header className="site-header">
        <a className="brand" href="https://www.cefip.cz"><img src="/assets/cefip-logo-white.png" alt="CEFIP" /></a>
        <a className="header-phone" href="tel:+420730535775"><span>Zavolat</span> +420 730 535 775</a>
      </header>
      <section>
        <p>POPTÁVKA BYLA PŘIJATA</p>
        <h1>Děkujeme.<br /><em>Teď je řada na nás.</em></h1>
        <span>Projdeme zadané informace a ozveme se kvůli doplnění podkladů nebo domluvě dalšího kroku.</span>
        <div className="thank-you-actions">
          <a className="pill-cta" href="tel:+420730535775">Potřebujete něco doplnit? Zavolejte</a>
          <a href="https://www.cefip.cz">Zpět na cefip.cz</a>
        </div>
        <small>Odesláním poptávky nevznikla objednávka služby, povinnost nemovitost prodat ani povinnost CEFIP nemovitost vykoupit.</small>
      </section>
    </main>
  );
}
