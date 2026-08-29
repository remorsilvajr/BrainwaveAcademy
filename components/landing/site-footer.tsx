const quickLinks = ['About Us', 'Programs', '6 Domains', 'Parent Portal Login']

export function SiteFooter() {
  return (
    <footer className="w-full bg-[#000739]">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col gap-8 px-6 py-12">
        <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-3">
          <section
            className="flex flex-col items-start gap-4"
            aria-label="Brainwave Preschool Academy"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              className="h-10 w-auto opacity-80"
              alt="Brainwave Learning Center"
              src="/images/landing/footer-logo.png"
            />
            <p className="text-base leading-6 text-[#bac3ff]">
              Nurturing Young Learners in Their Most Formative Years.
            </p>
          </section>

          <section
            className="flex flex-col items-start gap-4"
            aria-labelledby="contact-us-heading"
          >
            <h2
              id="contact-us-heading"
              className="text-2xl font-semibold leading-8 text-white"
            >
              Contact Us
            </h2>
            <address className="flex items-start gap-2 not-italic">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className="mt-1 h-3 w-3"
                alt=""
                aria-hidden="true"
                src="/images/landing/location-icon.svg"
              />
              <p className="text-base leading-6 text-[#bac3ff]">
                Tagum City, Davao del Norte, Philippines
              </p>
            </address>
          </section>

          <nav
            className="flex flex-col items-start gap-4"
            aria-labelledby="quick-links-heading"
          >
            <h2
              id="quick-links-heading"
              className="text-2xl font-semibold leading-8 text-white"
            >
              Quick Links
            </h2>
            <ul className="flex flex-col items-start gap-2 list-none m-0 p-0">
              {quickLinks.map((link) => (
                <li key={link}>
                  <a
                    href="#"
                    className="text-base leading-6 text-[#bac3ff] no-underline hover:text-white"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="w-full border-t border-[#ffffff1a] pt-6 text-center">
          <p className="text-xs font-medium tracking-[0.24px] text-[#bac3ff]">
            © 2024 Brainwave Preschool Academy. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
