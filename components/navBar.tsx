import Link from "next/link";
import { siteConfig } from "@/config/siteConfig";

export default function Navbar() {
  return (
    <nav className="w-full h-[80px] lg:h-[215px] flex items-center justify-between px-4 lg:px-[80px] bg-white border-b border-black/30">

      <div className="flex items-center gap-2 lg:gap-[26px]">
        {/* Logo links to the info page */}
        <Link href="/info" className="hover:opacity-90 transition-opacity">
          <img
            src="/assets/bwa_logo.png"
            alt={`${siteConfig.name} Logo`}
            className="w-[60px] h-auto lg:w-[189px] lg:h-[96px] object-contain"
          />
        </Link>

        {/* Text header remains standard text */}
        <h1 className="font-heading text-[24px] lg:text-[50px] font-extrabold leading-tight opacity-70">
          <span className="hidden lg:inline">
            <span className="text-brand-primary">{siteConfig.name.split(" ")[0]}</span>{" "}
            <span className="text-black">{siteConfig.name.split(" ")[1]}</span>
          </span>
        </h1>
      </div>

      <Link
        href={siteConfig.links.login}
        className="font-button flex items-center justify-center px-4 py-2 lg:w-[284px] lg:h-[81px] bg-brand-primary rounded-btn text-white text-[16px] lg:text-[30px] font-semibold hover:bg-blue-800 transition-colors"
      >
        Log in
      </Link>

    </nav>
  );
}