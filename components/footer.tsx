import React from "react";
import { siteConfig } from "@/config/siteConfig";

export default function Footer() {
  return (
    <footer className="w-full bg-brand-secondary bg-opacity-35 py-10 px-8 md:px-20 mt-auto border-t border-blue-100">
      <div className="max-w-[1920px] mx-auto flex flex-col lg:flex-row items-center justify-between gap-6">

        <div className="font-heading text-[20px] font-extrabold text-brand-primary opacity-70">
          {siteConfig.name}
        </div>

        <div className="font-body flex flex-col md:flex-row items-center gap-4 md:gap-8 text-[15px] md:text-[18px] font-bold text-black text-center">

          <div className="flex items-center gap-2">
            <span>📍</span>
            <span>{siteConfig.contact.address}</span>
          </div>

          <div className="flex items-center gap-2">
            <span>📞</span>
            <span>{siteConfig.contact.phone}</span>
          </div>

          <div className="flex items-center gap-2">
            <span>✉️</span>
            <span>{siteConfig.contact.email}</span>
          </div>

        </div>
      </div>
    </footer>
  );
}