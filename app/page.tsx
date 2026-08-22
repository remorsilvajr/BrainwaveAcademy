import Navbar from "@/components/navBar";
import FeatureCard from "@/components/featureCards";
import Footer from "@/components/footer";
import Link from "next/link";
import { siteConfig } from "@/config/siteConfig";
import { BookOpen, CalendarCheck, Megaphone } from "lucide-react";

export default function LandingPage() {
  return (
    <div
      className="min-h-screen w-full bg-cover bg-top bg-no-repeat flex flex-col justify-between font-body relative"
      style={{ backgroundImage: "url('/assets/bg.png')" }}
    >
      <Navbar />

      <main className="flex-grow max-w-[1920px] w-full mx-auto px-8 md:px-20 flex flex-col justify-center gap-12 py-6">

        {/* HERO TEXT */}
        <div className="max-w-xl lg:max-w-2xl space-y-4 md:space-y-6 pt-4">
          <h2 className="font-heading text-[40px] md:text-[55px] font-extrabold leading-tight text-black opacity-70">
            Welcome to <br />
            <span className="text-brand-primary">{siteConfig.name}</span>
          </h2>

          <p className="font-body text-[16px] md:text-[20px] font-semibold text-black leading-snug">
            {siteConfig.description}
          </p>

          <Link
            href={siteConfig.links.enrollment}
            className="font-button inline-flex items-center justify-center px-8 py-3 md:px-10 md:py-4 bg-brand-primary text-white text-[18px] md:text-[22px] font-semibold rounded-btn hover:bg-blue-800 transition-colors"
          >
            Start Enrollment &rarr;
          </Link>
        </div>

        {/* FEATURE CARDS WITH LUCIDE ICONS */}
        <div className="w-full lg:w-[70%] flex flex-col md:flex-row items-center gap-6 z-10">
          <FeatureCard
            title="Our Programs"
            description="Explore available programs and grade levels"
            linkText="View Programs &rarr;"
            linkHref="/programs"
            icon={<BookOpen className="w-[45px] h-[43px] text-brand-primary" />}
          />

          <FeatureCard
            title="Academic Calendar"
            description="View important enrollment dates, holidays, and school events."
            linkText="View Calendar &rarr;"
            linkHref="/calendar"
            icon={<CalendarCheck className="w-[45px] h-[43px] text-brand-primary" />}
          />

          <FeatureCard
            title="Announcements"
            description="Stay updated with the latest school news, enrollment updates, and events."
            linkText="View Announcements &rarr;"
            linkHref="/announcements"
            icon={<Megaphone className="w-[45px] h-[43px] text-brand-primary" />}
          />
        </div>

      </main>

      <Footer />
    </div>
  );
}