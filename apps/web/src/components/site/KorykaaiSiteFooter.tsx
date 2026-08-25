import { korykaaiLogoUrl, korykaaiPath } from "@/lib/korykaai-site";

const YEAR = new Date().getFullYear();

const NAV_COLUMNS = [
  {
    heading: "Navigate",
    links: [
      { href: korykaaiPath("/case-studies"), label: "Case Studies" },
      { href: korykaaiPath("/open-source"), label: "Open Source" },
      { href: korykaaiPath("/web-projects"), label: "Web Projects" },
      { href: korykaaiPath("/"), label: "Home" },
      { href: korykaaiPath("/blog"), label: "Blog" },
      { href: korykaaiPath("/videos"), label: "Videos" },
      { href: korykaaiPath("/resources"), label: "Resources" },
      { href: korykaaiPath("/tools"), label: "Tools" },
      { href: "https://pageink.korykaai.com", label: "PageInk", external: true },
      { href: korykaaiPath("/#about"), label: "About" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { href: korykaaiPath("/resources/project-management"), label: "Project Management Resources" },
      {
        href: korykaaiPath("/resources/business-analytics/buyitaly-mortgages-case-study"),
        label: "Business Analytics Case Study",
      },
      { href: korykaaiPath("/resources"), label: "Free Templates" },
      { href: korykaaiPath("/api/ebook/download"), label: "Built Anyway PDF", external: true },
    ],
  },
  {
    heading: "Products",
    links: [
      { href: "https://pageink.korykaai.com", label: "PageInk", external: true },
      { href: "https://www.veteranoneup.com", label: "VeteranOneUp", external: true },
      { href: "https://www.ipentesting.com", label: "iPentesting", external: true },
      { href: "https://kaai.io", label: "Kaai.io", external: true },
      { href: "https://clientsdock.com", label: "ClientsDock", external: true },
      { href: "https://namemetrix.com", label: "NameMetrix", external: true },
      { href: "https://www.joltreview.com", label: "JoltReview", external: true },
      { href: "https://kaaitech.com", label: "KAAI TECH", external: true },
    ],
  },
  {
    heading: "Connect",
    links: [
      { href: "https://github.com/kory-kaai", label: "GitHub", external: true },
      { href: "https://linkedin.com/in/korykaai", label: "LinkedIn", external: true },
      { href: "https://x.com/korykaai", label: "X (Twitter)", external: true },
    ],
  },
] as const;

const LEGAL_LINKS = [
  { href: korykaaiPath("/terms"), label: "Terms of Use" },
  { href: korykaaiPath("/privacy"), label: "Privacy Policy" },
  { href: korykaaiPath("/cookies"), label: "Cookie Policy" },
  { href: korykaaiPath("/ccpa"), label: "CCPA" },
  { href: korykaaiPath("/dpa"), label: "DPA" },
  { href: korykaaiPath("/refund"), label: "Refund Policy" },
] as const;

/** Shared korykaai.com footer — links back to the main site from the PageInk subdomain. */
export function KorykaaiSiteFooter() {
  return (
    <footer className="site-footer" role="contentinfo">
      <div className="site-footer__inner">
        <div className="site-footer__top">
          <div className="site-footer__brand">
            <a href={korykaaiPath("/")} className="site-footer__logo">
              <span className="site-footer__logo-mark" aria-hidden>
                {/* eslint-disable-next-line @next/next/no-img-element -- brand mark hosted on korykaai.com */}
                <img src={korykaaiLogoUrl} alt="" width={36} height={36} decoding="async" />
              </span>
              Kory Kaai
            </a>
            <p className="site-footer__tagline">
              Technical Project Manager and IT delivery lead — systems implementation and stakeholder
              coordination.
              <br />
              Case studies, portfolio, blog, and contact at korykaai.com.
            </p>
          </div>

          <div className="site-footer__columns">
            {NAV_COLUMNS.map((col) => (
              <div key={col.heading} className="site-footer__col">
                <h3 className="site-footer__col-heading">{col.heading}</h3>
                <ul className="site-footer__col-list">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      {"external" in link && link.external ? (
                        <a
                          href={link.href}
                          className="site-footer__link"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {link.label}
                        </a>
                      ) : (
                        <a href={link.href} className="site-footer__link">
                          {link.label}
                        </a>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="site-footer__divider" />

        <div className="site-footer__bottom">
          <p className="site-footer__copyright">
            &copy; {YEAR} KAAI TECH LLC. All rights reserved.
          </p>
          <nav className="site-footer__legal" aria-label="Legal">
            {LEGAL_LINKS.map((link, i) => (
              <span key={link.href}>
                {i > 0 && <span className="site-footer__legal-sep" aria-hidden>·</span>}
                <a href={link.href} className="site-footer__legal-link">
                  {link.label}
                </a>
              </span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
