export default function HomePage() {
  return (
    <main className="gateway">
      <header className="site-header gateway-header">
        <a className="brand" href="https://www.cefip.cz" aria-label="CEFIP – hlavní web">
          <img src="/assets/cefip-logo-white.png" alt="CEFIP" />
        </a>
        <a className="header-phone" href="tel:+420730535775"><span>Zavolat</span> +420 730 535 775</a>
      </header>
      <section className="gateway-intro">
        <p>SLUŽBY PRO KAŽDOU ADRESU</p>
        <h1>Co chcete vyřešit?</h1>
        <span>Vyberte jednu cestu. Každá má vlastní krátkou poptávku a konkrétní další postup.</span>
      </section>
      <section className="gateway-grid">
        <a href="/rekonstrukce" className="gateway-card">
          <img src="/assets/reconstruction-hero.webp" alt="Rekonstrukce nemovitosti" />
          <div><small>STAVBA A REKONSTRUKCE</small><h2>Nový prostor od prvního plánu.</h2><span>Poptat rekonstrukci →</span></div>
        </a>
        <a href="/vykup-nemovitosti" className="gateway-card gateway-card-dark">
          <img src="/assets/buyout-hero.webp" alt="Dům a klíč jako symbol přímého výkupu" />
          <div><small>REALITNÍ SLUŽBY</small><h2>Nejdřív fakta. Potom nabídka.</h2><span>Požádat o posouzení →</span></div>
        </a>
      </section>
    </main>
  );
}
