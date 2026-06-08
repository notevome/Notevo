"use client";
import Link from "next/link";
import Image from "next/image";
export default function Footer() {
  return (
    <div className="relative w-full overflow-hidden bg-transparent">
      {/* Wave SVG — pinned to top, fixed height, overflow hidden keeps it in bounds */}
      <div className="absolute top-4 left-0 w-full h-16 md:h-24 overflow-hidden pointer-events-none select-none">
        <svg
          width="11 0%"
          height="100%"
          viewBox="0 0 253 30"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          style={{ display: "block", width: "100%" }}
        >
          <g clipPath="url(#footerWaveClip)">
            <path
              d="M275 47.47L268.81 46.32L264.68 43.32L267.2 36.44L260.9 31.39L255.62 31.51L252 25.8L245.35 23.62L243.63 18.46L243.08 10.32L234.69 1.72L228.19 3L221.89 1.4L217.89 6.4L212.48 5L206.41 2L193.68 3.21L184.51 2.87L179.58 10.55L174.65 10.43L169.49 12.43L165.71 9.57L160.09 10.48L159.09 7.62L155.62 5.5L153.1 1.83L145.41 3L134.29 2.31L120.08 3.67L108.84 2L95.54 2.92L84.42 1L71.12 2.18L68.48 0L61.38 1.72L55.87 4.72C54.8501 4.95885 53.7885 4.95668 52.7696 4.71366C51.7506 4.47064 50.8023 3.99346 50 3.32C46.9 1.03 42.54 3.32 42.54 3.32L41.63 8.32L35.32 11.87L31.19 21.62L26.38 20.13L22.02 22.19L14.22 18.29L9.75 20.59L3.71 19L0 21.55L3.55 22.55L8.1 25.41L12.57 23.12L20.68 27.12L25 25L32.53 25.15L36.53 16.69L43.05 13.84L43.97 8.84C43.97 8.84 48 5.67 51.06 8C52.3294 8.77709 53.7586 9.2558 55.24 9.4L59.31 7.19L67.07 4.83L69.71 7L83.08 5.35L94.2 7.18L107.5 6.27L118.74 8L133 6.61L144.12 7.3L151.22 6.76L153.55 11L157.22 12.53L158.22 15.39L163.84 14.48L167.63 17.34L172.79 15.39L180.79 15.16L185.72 7.48L191.63 8.71L204.01 6.71L210.09 9.81L217 11.18L221 6.18L226.1 8.5L231.46 6L239.86 14.6L240.4 22.74L242.12 27.9L248 30.21L251.55 35.94L256.82 35.83L261.82 39.83L260.69 46L266.14 50.53L272.33 51.68L275.94 56.09L282.5 55L278 52.62L275 47.47Z"
              fill="#644A40"
              opacity={0.9}
            />
            <path
              d="M272.33 51.7099L266.14 50.5599L260.69 45.9999L261.82 39.7699L256.82 35.7699L251.55 35.8799L248 30.2099L242.09 27.9199L240.37 22.7599L239.83 14.6199L231.46 5.99995L226.13 8.42995L221 6.12995L217 11.1799L210.07 9.74995L204 6.64995L191.62 8.64995L185.71 7.41995L180.78 15.0999L172.78 15.3299L167.62 17.2799L163.83 14.4199L158.21 15.3299L157.21 12.4699L153.55 10.9999L151.18 6.78995L144.08 7.32995L133 6.60995L118.74 7.99995L107.5 6.26995L94.2 7.17995L83.08 5.34995L69.71 6.99995L67.07 4.81995L59.31 7.17995L55.24 9.38995C53.7595 9.24879 52.3302 8.77353 51.06 7.99995C47.98 5.67995 44.06 8.83995 44.06 8.83995L43.14 13.8399L36.62 16.6899L32.62 25.1499L25 24.9999L20.68 27.0999L12.57 23.0999L8.1 25.4099L3.55 22.5899L0 21.5499V65.9199H282.5V54.9999L275.94 56.1299L272.33 51.7099Z"
              fill="#EFEFEF"
            />
          </g>
          <defs>
            <clipPath id="footerWaveClip">
              <rect width="282.5" height="85.92" fill="white" />
            </clipPath>
          </defs>
        </svg>
      </div>
      <footer className="relative w-full z-10 text-foreground mt-20 md:mt-28 pb-10 bg-[#EFEFEF]">
        <div className="max-w-6xl mx-auto py-5 px-6 md:px-12 lg:px-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <Link
                href="/"
                onClick={() => {
                  if (window.location.pathname === "/") {
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }
                }}
              >
                <Image
                  src="/Notevo-logo.svg"
                  alt="Notevo logo"
                  className="pb-2 hover:opacity-50"
                  width={50}
                  height={50}
                />
              </Link>
              <h2 className="text-2xl font-bold text-primary">Notevo</h2>
              <p className="mt-2 text-muted-foreground">
                Notes without the hassle.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground">Notevo</h3>
              <ul className="mt-2 space-y-2 text-muted-foreground">
                <li>
                  <Link href="/#about" className="hover:underline">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/#features" className="hover:underline">
                    Features
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://notevo.me/public/document/k57etpnqzy45zav3vf8v38mbcn8856qn"
                    target="_blank"
                    className="hover:underline"
                  >
                    Give our text editor a try
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground">Legal</h3>
              <ul className="mt-2 space-y-2 text-muted-foreground">
                <li>
                  <Link
                    prefetch={true}
                    href="/terms-of-service"
                    className="hover:underline"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    prefetch={true}
                    href="/privacy-policy"
                    className="hover:underline"
                  >
                    Privacy Policy
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-foreground">
                Social {`&`} Contact
              </h3>
              <ul className="mt-2 space-y-2 text-muted-foreground">
                <li>
                  <Link
                    href="https://www.linkedin.com/company/notevo"
                    className="hover:underline"
                    target="_blank"
                  >
                    Linkedin
                  </Link>
                </li>
                <li>
                  <Link
                    href="https://github.com/notevome"
                    target="_blank"
                    className="hover:underline"
                  >
                    Version {process.env.NEXT_PUBLIC_APP_VERSION}
                  </Link>
                </li>
                <li>
                  <Link
                    href="mailto:support@notevo.me"
                    className="hover:underline"
                  >
                    support@notevo.me
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-5 border-t border-primary/20 pt-5 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-start text-muted-foreground text-sm">
              Copyright © 2025-{new Date().getFullYear()} Notevo. All rights
              reserved.
            </div>
            <p className="text-start text-muted-foreground text-sm">
              Designed and built by{" "}
              <Link
                href="https://www.mohammedh.dev/"
                className="hover:underline"
                target="_blank"
              >
                @Mohammed H.
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
