import Link from "next/link";
import { siteConfig } from "@/config/siteConfig";
import {
  Heart,
  Smile,
  Star,
  Brain,
  MessageSquare,
  Palette,
  ArrowRight
} from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-800 font-body">
      {/* Navigation */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <img src="/assets/bwa_logo.png" alt="Logo" className="h-12 w-auto object-contain" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 font-medium text-slate-600 text-sm">
            <a href="#about" className="hover:text-brand-navy transition-colors">About Us</a>
            <a href="#programs" className="hover:text-brand-navy transition-colors">Programs</a>
            <a href="#domains" className="hover:text-brand-navy transition-colors">6 Domains</a>
            <a href="#feedback" className="hover:text-brand-navy transition-colors">Grading & Feedback</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-full bg-brand-pink text-white font-button text-sm font-semibold hover:bg-brand-pinkHover transition-all shadow-sm"
            >
              Enroll
            </Link>
            <Link
              href="/login"
              className="px-5 py-2.5 rounded-full bg-brand-navy text-white font-button text-sm font-semibold hover:bg-navy-900 transition-all shadow-sm"
            >
              Log In
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="px-6 pt-16 pb-20 text-center bg-[#F8FAFC]">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold mb-6 border border-emerald-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Est. June 22, 2005 • Tagum City
        </div>

        <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl font-extrabold text-brand-navy leading-tight tracking-tight mb-6">
          Nurturing Young Learners <br />
          in Their Most Formative Years
        </h1>

        <p className="text-slate-600 text-base sm:text-lg max-w-2xl mx-auto mb-8 leading-relaxed">
          Guided by Directress Dr. Elena C. Lagrimas, Brainwave Preschool Academy provides a holistic, vibrant environment where every child's potential is recognized and cultivated.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <a
            href="#programs"
            className="px-6 py-3.5 rounded-full bg-brand-pink text-white font-button font-semibold text-sm hover:bg-brand-pinkHover transition-all shadow-md"
          >
            Explore Programs
          </a>
          <a
            href="#domains"
            className="px-6 py-3.5 rounded-full bg-brand-sky border border-sky-300 text-brand-skyText font-button font-semibold text-sm hover:bg-sky-100 transition-all"
          >
            Learn About Our 6 Domains
          </a>
        </div>
      </section>

      {/* Our Journey & Founder Quote */}
      <section id="about" className="w-full bg-[#F5F2F9] px-6 py-16">
        <div className="mx-auto w-full max-w-7xl">

          {/* Section Heading */}
          <div className="text-center mb-12">
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-brand-navy mb-3">
              Our Journey
            </h2>

            <p className="text-slate-500 text-sm md:text-base max-w-2xl mx-auto">
              Building a foundation of excellence in early childhood education
              since 2005.
            </p>
          </div>

          {/* Journey Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

            {/* 2005 */}
            <div className="relative overflow-hidden bg-slate-100/70 p-6 md:p-8 rounded-2xl min-h-[220px] h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="text-3xl font-bold text-slate-800 mb-1">
                2005
              </span>

              <span className="text-xs font-semibold text-brand-pink uppercase tracking-wider mb-3">
                Founded
              </span>

              <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                Brainwave Learning Center opens its doors to young minds in
                Tagum City.
              </p>

              <div className="absolute top-0 right-0 w-20 h-20 bg-slate-200/50 rounded-bl-full pointer-events-none" />
            </div>

            {/* 2011 */}
            <div className="bg-slate-100/70 border-slate-100 p-6 md:p-8 rounded-2xl min-h-[220px] h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="text-3xl font-bold text-slate-800 mb-1">
                2011
              </span>

              <span className="text-xs font-semibold text-sky-600 uppercase tracking-wider mb-3">
                Nursery & Kinder
              </span>

              <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                Expanded programs to formally include comprehensive Nursery
                and Kindergarten curriculums.
              </p>
            </div>

            {/* 2017 */}
            <div className="bg-slate-100/70 border-slate-100 p-6 md:p-8 rounded-2xl min-h-[220px] h-full flex flex-col transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
              <span className="text-3xl font-bold text-slate-800 mb-1">
                2017
              </span>

              <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-3">
                Toddler Program
              </span>

              <p className="text-slate-600 text-sm md:text-base leading-relaxed">
                Introduced specialized programs for early toddlers, focusing
                on foundational social and motor skills.
              </p>
            </div>

          </div>

          {/* Founder Quote Card */}
          <div className="bg-white border border-slate-100 shadow-xl shadow-slate-100/70 rounded-3xl p-6 md:p-8 lg:p-10 w-full flex flex-col md:flex-row items-center gap-6 md:gap-8">

            {/* Founder Image */}
            <div className="w-28 h-28 md:w-36 md:h-36 lg:w-40 lg:h-40 rounded-full overflow-hidden shrink-0 border-4 border-slate-50 shadow-inner">
              <img
                src="/assets/directress.png"
                alt="Dr. Elena C. Lagrimas"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Quote */}
            <div className="text-center md:text-left">
              <h3 className="font-heading text-xl md:text-2xl font-bold text-brand-navy">
                Dr. Elena C. Lagrimas
              </h3>

              <p className="text-xs md:text-sm font-semibold text-brand-pink mb-4">
                Directress & Founder
              </p>

              <blockquote className="text-slate-600 italic text-sm md:text-base leading-relaxed">
                "Our mission is to create a nurturing space where every child
                feels safe to explore, make mistakes, and grow into their unique
                potential. Education in these early years shapes a lifetime."
              </blockquote>
            </div>

          </div>

        </div>
      </section>

      {/* Programs Section */}
      <section id="programs" className="max-w-6xl mx-auto px-6 py-16 bg-[#F8FAFC]">
        <div className="text-center mb-12">
          <h2 className="font-heading text-3xl font-bold text-brand-navy mb-2">Our Educational Programs</h2>
          <p className="text-slate-500 text-sm">Tailored curriculums designed for every stage of early childhood development.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="h-44 bg-slate-200 relative">
              <img src="/assets/program_toddler.jpg" alt="Little Explorers" className="w-full h-full object-cover" />
              <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-full">Ages 1-3</span>
            </div>
            <div className="p-6">
              <h3 className="font-heading font-bold text-lg text-brand-navy mb-2">Little Explorers</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Sensory-rich environment focusing on gross motor skills and basic socialization.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="h-44 bg-slate-200 relative">
              <img src="/assets/program_advanced.jpg" alt="Advanced Toddler" className="w-full h-full object-cover" />
              <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-full">Ages 2-4</span>
            </div>
            <div className="p-6">
              <h3 className="font-heading font-bold text-lg text-brand-navy mb-2">Advanced Toddler</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Introduction to structured play, fine motor skills, and early language development.</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="h-44 bg-slate-200 relative">
              <img src="/assets/program_nursery.jpg" alt="Smart Explorers" className="w-full h-full object-cover" />
              <span className="absolute top-3 right-3 bg-white/90 backdrop-blur-sm text-slate-700 text-[11px] font-bold px-2.5 py-1 rounded-full">Nursery</span>
            </div>
            <div className="p-6">
              <h3 className="font-heading font-bold text-lg text-brand-navy mb-2">Smart Explorers</h3>
              <p className="text-slate-600 text-sm leading-relaxed">Foundational phonics, basic numeracy, and fostering independence.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 6 Learning Domains (Navy Section) */}
      <section id="domains" className="bg-brand-navy text-white py-20 px-6 mt-12">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-3xl font-bold mb-2">The 6 Domains of Development</h2>
            <p className="text-blue-200 text-sm">Our holistic approach ensures every aspect of your child's growth is nurtured.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 text-emerald-400 font-bold mb-3 text-sm">
                <Smile className="w-5 h-5" /> Physical Health
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">Developing gross and fine motor skills through active play and structured physical activities.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 text-brand-pink font-bold mb-3 text-sm">
                <Heart className="w-5 h-5" /> Social-Emotional
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">Fostering empathy, relationship building, and healthy emotional expression.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 text-sky-400 font-bold mb-3 text-sm">
                <Star className="w-5 h-5" /> Character
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">Instilling core values like respect, honesty, and responsibility in daily interactions.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 text-indigo-400 font-bold mb-3 text-sm">
                <Brain className="w-5 h-5" /> Cognitive
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">Encouraging critical thinking, problem-solving, and a love for discovery.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 text-teal-400 font-bold mb-3 text-sm">
                <MessageSquare className="w-5 h-5" /> Language
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">Building strong communication skills through active listening, speaking, and early literacy.</p>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-colors">
              <div className="flex items-center gap-3 text-pink-400 font-bold mb-3 text-sm">
                <Palette className="w-5 h-5" /> Creative
              </div>
              <p className="text-slate-300 text-sm leading-relaxed">Inspiring imagination through art, music, dramatic play, and unrestricted expression.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-navy border-t border-white/10 text-white/70 py-12 px-6 text-sm">
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 mb-8">
          <div>
            <img src="/assets/bwa_logo.png" alt="Brainwave Academy" className="h-10 w-auto mb-3" />
            <p className="text-xs text-white/50">Nurturing Young Learners in Their Most Formative Years.</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Contact Us</h4>
            <p className="text-xs leading-relaxed">Tagum City, Davao del Norte, Philippines</p>
          </div>
          <div>
            <h4 className="font-bold text-white mb-3">Quick Links</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="#about" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#programs" className="hover:text-white transition-colors">Programs</a></li>
              <li><a href="#domains" className="hover:text-white transition-colors">6 Domains</a></li>
              <li><Link href="/login" className="hover:text-white transition-colors">Parent Portal Login</Link></li>
            </ul>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-6 border-t border-white/10 text-center text-xs text-white/40">
          © {new Date().getFullYear()} Brainwave Preschool Academy. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}