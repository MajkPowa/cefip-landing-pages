'use client';

import { useEffect, useMemo, useState } from 'react';
import { LeadForm } from './lead-form';
import { trackMeta } from './analytics';
import type { LandingContent } from '../lib/landing-content';

type LandingPageProps = {
  content: LandingContent;
};

function getVariant(content: LandingContent) {
  const params = new URLSearchParams(window.location.search);
  const direct = params.get('v')?.toLowerCase();
  if (direct && content.variantHeadlines[direct]) return direct;
  const utmContent = params.get('utm_content')?.toLowerCase() ?? '';
  return Object.keys(content.variantHeadlines).find((key) => utmContent.includes(key)) ?? 'default';
}

export function LandingPage({ content }: LandingPageProps) {
  const [variant, setVariant] = useState('default');
  const headline = content.variantHeadlines[variant] ?? content.defaultHeadline;

  useEffect(() => {
    const detected = getVariant(content);
    const frame = window.requestAnimationFrame(() => setVariant(detected));
    const sendViewContent = () => {
      trackMeta('ViewContent', {
        content_name: content.serviceType === 'reconstruction' ? 'cefip_reconstruction' : 'cefip_property_buyout',
        content_category: content.serviceType,
        landing_variant: detected,
      });
    };
    document.addEventListener('cefip:pixel-ready', sendViewContent, { once: true });
    sendViewContent();
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('cefip:pixel-ready', sendViewContent);
    };
  }, [content]);

  const qualifierVisible = content.serviceType === 'buyout' && variant === 'v1';
  const gallery = useMemo(() => [
    { src: '/assets/2byt.webp', alt: 'Dokončená koupelna po rekonstrukci' },
    { src: '/assets/2kuchyn.webp', alt: 'Dokončená kuchyně po rekonstrukci' },
    { src: '/assets/2dum.webp', alt: 'Rodinný dům po stavebních úpravách' },
  ], []);

  const trackContact = (channel: 'phone' | 'email') => {
    trackMeta('Contact', {
      contact_channel: channel,
      content_category: content.serviceType,
      landing_variant: variant,
    });
  };

  return (
    <main className={`landing landing-${content.serviceType}`}>
      <header className="site-header">
        <a className="brand" href="https://www.cefip.cz" aria-label="CEFIP – hlavní web">
          <img src="/assets/cefip-logo-white.png" alt="CEFIP" />
        </a>
        <div className="header-category">{content.category}</div>
        <a className="header-phone" href="tel:+420730535775" onClick={() => trackContact('phone')}>
          <span>Zavolat</span> +420 730 535 775
        </a>
      </header>

      <section className="campaign-hero" aria-labelledby="hero-title">
        <div className="campaign-copy">
          <p className="campaign-eyebrow">{content.eyebrow}</p>
          <h1 id="hero-title"><span>{headline.first}</span><em>{headline.accent}</em></h1>
          <p className="campaign-lead">{content.lead}</p>
          <ul className="campaign-points">
            {content.heroPoints.map((point) => <li key={point}>{point}</li>)}
          </ul>
          <div className="hero-cta-row">
            <a className="pill-cta" href="#poptavka">{content.primaryCta}</a>
            <a className="text-cta" href="tel:+420730535775" onClick={() => trackContact('phone')}>Raději zavoláte?</a>
          </div>
          {qualifierVisible && <p className="claim-qualifier">{content.qualifier}</p>}
        </div>

        <div className="campaign-visual">
          <img src={content.heroImage} alt={content.heroImageAlt} fetchPriority="high" />
          <span className="illustration-label">Ilustrační vizualizace</span>
          <LeadForm
            serviceType={content.serviceType}
            title={content.formTitle}
            intro={content.formIntro}
            primaryCta={content.primaryCta}
            landingVariant={variant}
          />
        </div>
      </section>

      <section className="proof-strip" aria-label="Důležité informace">
        <p>{content.proofLine}</p>
        <a href="mailto:info@cefip.cz" onClick={() => trackContact('email')}>info@cefip.cz</a>
      </section>

      <section className="content-section service-section" id="rozsah">
        <div className="section-heading">
          <p>{content.sectionEyebrow}</p>
          <h2>{content.sectionTitle}</h2>
          <span>{content.sectionText}</span>
        </div>
        <div className="service-grid">
          {content.services.map((service, index) => (
            <article className="service-card" key={service.title}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <h3>{service.title}</h3>
              <p>{service.text}</p>
            </article>
          ))}
        </div>
      </section>

      {content.serviceType === 'reconstruction' ? (
        <section className="gallery-section" aria-labelledby="gallery-title">
          <div className="gallery-copy">
            <p>VYBRANÉ REALIZACE</p>
            <h2 id="gallery-title">Výsledek musí fungovat v každém detailu.</h2>
            <span>Ukázky dokončených prostor z prezentace CEFIP.</span>
          </div>
          <div className="project-gallery">
            {gallery.map((image) => <img key={image.src} src={image.src} alt={image.alt} loading="lazy" />)}
          </div>
        </section>
      ) : (
        <section className="comparison-section" aria-labelledby="comparison-title">
          <div className="comparison-heading">
            <p>DVĚ PRODEJNÍ CESTY</p>
            <h2 id="comparison-title">Běžný prodej, nebo přímý výkup?</h2>
            <span>Vhodná cesta závisí na nemovitosti a vašem cíli.</span>
          </div>
          <div className="comparison-grid">
            <article>
              <small>BĚŽNÝ PRODEJ</small>
              <h3>Prezentace na trhu</h3>
              <ul>
                <li>Hledání kupujícího a organizace prohlídek</li>
                <li>Průběh ovlivňuje poptávka i financování kupujícího</li>
                <li>Podmínky se tvoří v průběhu prodeje</li>
              </ul>
            </article>
            <article className="comparison-dark">
              <small>PŘÍMÝ VÝKUP</small>
              <h3>Individuální posouzení</h3>
              <ul>
                <li>Bez veřejného hledání kupujícího</li>
                <li>Cena a termín jsou součástí konkrétní nabídky</li>
                <li>Možnost výkupu není automatická ani garantovaná</li>
              </ul>
            </article>
          </div>
        </section>
      )}

      <section className="process-section" id="postup">
        <div className="process-intro">
          <p>JAK TO FUNGUJE</p>
          <h2>{content.processTitle}</h2>
          <span>{content.processNote}</span>
        </div>
        <ol className="process-list">
          {content.process.map((item, index) => (
            <li key={item.title}>
              <b>{String(index + 1).padStart(2, '0')}</b>
              <div><h3>{item.title}</h3><p>{item.text}</p></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="objection-section">
        <div className="objection-image">
          <img src={content.objectionImage} alt={content.objectionImageAlt} loading="lazy" />
          <span className="illustration-label">Ilustrační vizualizace</span>
        </div>
        <div className="objection-copy">
          <p>PRVNÍ KROK</p>
          <h2>{content.objectionTitle}</h2>
          <span>{content.objectionText}</span>
          <a className="pill-cta" href="#poptavka">{content.primaryCta}</a>
        </div>
      </section>

      <section className="content-section reasons-section">
        <div className="section-heading compact-heading">
          <p>PROČ CEFIP</p>
          <h2>Rozhodujte se podle konkrétního postupu.</h2>
        </div>
        <div className="reason-grid">
          {content.reasons.map((reason) => (
            <article key={reason.title}><h3>{reason.title}</h3><p>{reason.text}</p></article>
          ))}
        </div>
      </section>

      <section className="faq-section" id="faq">
        <div className="faq-heading"><p>ČASTÉ DOTAZY</p><h2>Co je dobré vědět před odesláním</h2></div>
        <div className="faq-list">
          {content.faqs.map((faq) => (
            <details key={faq.question}>
              <summary>{faq.question}<span>+</span></summary>
              <p>{faq.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="final-cta-section">
        <div><p>POJĎME TO PROBRAT</p><h2>{content.finalTitle}</h2><span>{content.finalText}</span></div>
        <a className="pill-cta" href="#poptavka">{content.primaryCta}</a>
      </section>

      <footer className="site-footer">
        <img src="/assets/cefip-logo-white.png" alt="CEFIP" />
        <div>
          <strong>CEFIP</strong>
          <span>Svobody 282, 417 05 Osek</span>
        </div>
        <div>
          <a href="tel:+420730535775" onClick={() => trackContact('phone')}>+420 730 535 775</a>
          <a href="mailto:info@cefip.cz" onClick={() => trackContact('email')}>info@cefip.cz</a>
        </div>
        <div className="footer-links"><a href="/ochrana-osobnich-udaju">Ochrana osobních údajů</a><a href="https://www.cefip.cz">cefip.cz</a></div>
      </footer>

      <nav className="mobile-conversion-bar" aria-label="Rychlý kontakt">
        <a href="tel:+420730535775" onClick={() => trackContact('phone')}>Zavolat</a>
        <a href="#poptavka">{content.primaryCta}</a>
      </nav>
    </main>
  );
}
