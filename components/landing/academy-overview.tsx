'use client'

const journeyItems = [
  {
    year: '2005',
    label: 'Founded',
    color: 'text-[#e6007e]',
    description:
      'Brainwave Learning Center opens its doors to young minds in Tagum City.',
    decorative: true,
  },
  {
    year: '2011',
    label: 'Nursery & Kinder',
    color: 'text-[#00a3e0]',
    description:
      'Expanded programs to formally include comprehensive Nursery and Kindergarten curriculums.',
  },
  {
    year: '2017',
    label: 'Toddler Program',
    color: 'text-[#76c828]',
    description:
      'Introduced specialized programs for early toddlers, focusing on foundational social and motor skills.',
  },
]

const programs = [
  {
    title: 'Little Explorers',
    age: 'Ages 2-3',
    description:
      'Sensory-rich environment focusing on gross motor skills and basic socialization.',
    image: '/images/landing/program-little-explorers.jpg',
  },
  {
    title: 'Advanced Toddler',
    age: 'Ages 3-4',
    description:
      'Introduction to structured play, fine motor skills, and early language development.',
    image: '/images/landing/program-advanced-toddler.jpg',
  },
  {
    title: 'Smart Explorers',
    age: 'Nursery',
    description:
      'Foundational phonics, basic numeracy, and fostering independence.',
    image: '/images/landing/program-smart-explorers.jpg',
  },
  {
    title: 'Curious Adventurers',
    age: 'Kinder',
    description:
      'Kindergarten readiness, advanced phonics, early reading, and creative expression.',
    image: '/images/landing/program-curious-adventurers.jpg',
  },
]

const supportPrograms = [
  {
    title: 'Academic Tutorials',
    description:
      'One-on-one and small group specialized tutoring to support individual learning paces.',
    icon: '/images/landing/icon-tutorials.svg',
  },
  {
    title: 'Quiz Bee & Exam Prep',
    description:
      'Coaching for external competitions and preparation for elementary entrance examinations.',
    icon: '/images/landing/icon-quiz-bee.svg',
  },
]

const domains = [
  {
    title: 'Physical Health',
    description:
      'Developing gross and fine motor skills through active play and structured physical activities.',
    icon: '/images/landing/icon-physical.svg',
  },
  {
    title: 'Social-Emotional',
    description:
      'Fostering empathy, relationship building, and healthy emotional expression.',
    icon: '/images/landing/icon-social.svg',
  },
  {
    title: 'Character',
    description:
      'Instilling core values like respect, honesty, and responsibility in daily interactions.',
    icon: '/images/landing/icon-character.svg',
  },
  {
    title: 'Cognitive',
    description:
      'Encouraging critical thinking, problem-solving, and a love for discovery.',
    icon: '/images/landing/icon-cognitive.svg',
  },
  {
    title: 'Language',
    description:
      'Building strong communication skills through active listening, speaking, and early literacy.',
    icon: '/images/landing/icon-language.svg',
  },
  {
    title: 'Creative',
    description:
      'Inspiring imagination through art, music, dramatic play, and unrestricted expression.',
    icon: '/images/landing/icon-creative.svg',
  },
]

export function AcademyOverview() {
  const scrollToPrograms = () => {
    document.getElementById('programs')?.scrollIntoView({ behavior: 'smooth' })
  }

  const scrollToDomains = () => {
    document.getElementById('domains')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className="relative flex w-full flex-1 flex-col items-center gap-5 overflow-hidden">
      {/* Hero */}
      <section
        className="flex w-full max-w-[592px] flex-col items-center gap-6 px-6 pt-12 text-center"
        aria-labelledby="academy-heading"
      >
        <div className="inline-flex items-center gap-2 rounded-full px-4 py-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="h-3 w-3"
            alt=""
            src="/images/landing/badge-icon.svg"
            aria-hidden="true"
          />
          <p className="text-xs font-medium tracking-[0.24px] text-[#76c828]">
            Est. June 23, 2005 • Tagum City
          </p>
        </div>
        <h1
          id="academy-heading"
          className="text-4xl font-bold leading-[46px] tracking-[-0.96px] text-[#0b1b62] sm:text-5xl sm:leading-[56px]"
        >
          Nurturing Young Learners
          <br />
          in Their Most Formative
          <br />
          Years
        </h1>
        <p className="text-base leading-7 text-[#454650] sm:text-lg">
          Guided by Directress Dr. Elena C. Lagrimas, Brainwave Preschool
          Academy provides a holistic, vibrant environment where every
          child&apos;s potential is recognized and cultivated.
        </p>
        <nav
          className="flex flex-wrap items-center justify-center gap-4 pt-2"
          aria-label="Academy overview links"
        >
          <button
            type="button"
            onClick={scrollToPrograms}
            className="rounded-full bg-[#e6007e] px-8 py-4 text-sm font-semibold tracking-[0.14px] text-white shadow-[0px_1px_2px_#0000000d] transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6007e]"
          >
            Explore Programs
          </button>
          <button
            type="button"
            onClick={scrollToDomains}
            className="rounded-full border-2 border-[#00a3e0] px-8 py-4 text-sm font-semibold tracking-[0.14px] text-[#00a3e0] transition-colors hover:bg-[#00a3e00d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00a3e0]"
          >
            Learn About Our 6 Domains
          </button>
        </nav>
      </section>

      {/* Journey + Founder */}
      <section
        id="about-us"
        className="flex w-full flex-col items-center bg-[#f5f2f9] px-0 py-12"
        aria-labelledby="journey-heading"
      >
        <div className="flex w-full max-w-screen-xl flex-col items-center gap-8 px-6">
          <header className="flex w-full flex-col items-center gap-2">
            <h2
              id="journey-heading"
              className="text-center text-[32px] font-bold leading-10 tracking-[-0.32px] text-[#0b1b62]"
            >
              Our Journey
            </h2>
            <p className="max-w-2xl text-center text-lg leading-7 text-[#454650]">
              Building a foundation of excellence in early childhood education
              since 2005.
            </p>
          </header>
          <ol className="grid w-full grid-cols-1 gap-6 md:grid-cols-3">
            {journeyItems.map((item) => (
              <li
                key={item.year}
                className="relative min-h-[186px] overflow-hidden rounded-xl border border-[#c6c5d2] bg-[#fbf8ff] px-6 pb-8 pt-6 shadow-[0px_1px_2px_#0000000d]"
              >
                {item.decorative && (
                  <span
                    className="absolute -right-[23px] -top-[23px] h-24 w-24 rounded-full bg-[#0b1b621a]"
                    aria-hidden="true"
                  />
                )}
                <time className="relative block text-2xl font-semibold leading-8 text-[#0b1b62]">
                  {item.year}
                </time>
                <p
                  className={`relative mt-1 text-sm font-semibold leading-5 tracking-[0.14px] ${item.color}`}
                >
                  {item.label}
                </p>
                <p className="relative mt-1 text-base leading-6 text-[#454650]">
                  {item.description}
                </p>
              </li>
            ))}
          </ol>
          <article className="flex w-full max-w-4xl flex-col items-center gap-8 rounded-2xl border border-[#c6c5d2] bg-[#fbf8ff] px-8 pb-8 pt-12 shadow-[0px_1px_2px_#0000000d] sm:flex-row">
            <div
              className="h-48 w-48 shrink-0 rounded-full border-4 border-[#f5f2f9] bg-cover bg-center shadow-[inset_0px_2px_4px_4px_#0000000d]"
              style={{ backgroundImage: 'url(/images/landing/founder.jpg)' }}
              role="img"
              aria-label="Dr. Elena C. Lagrimas"
            />
            <div>
              <h3 className="text-2xl font-semibold leading-8 text-[#0b1b62]">
                Dr. Elena C. Lagrimas
              </h3>
              <p className="mt-1 text-sm font-semibold leading-5 tracking-[0.14px] text-[#e6007e]">
                Directress &amp; Founder
              </p>
              <blockquote className="mt-3 text-lg italic leading-7 text-[#454650]">
                &quot;Our mission is to create a nurturing space where every
                child feels safe to explore, make mistakes, and grow into
                their unique potential. Education in these early years shapes
                a lifetime.&quot;
              </blockquote>
            </div>
          </article>
        </div>
      </section>

      {/* Programs */}
      <section
        id="programs"
        className="flex w-full flex-col items-center gap-8 px-6 py-12"
        aria-labelledby="programs-heading"
      >
        <header className="flex w-full flex-col items-center gap-2">
          <h2
            id="programs-heading"
            className="text-center text-[32px] font-bold leading-10 tracking-[-0.32px] text-[#0b1b62]"
          >
            Our Educational Programs
          </h2>
          <p className="max-w-2xl text-center text-lg leading-7 text-[#454650]">
            Tailored curriculums designed for every stage of early childhood
            development.
          </p>
        </header>
        <div className="grid w-full max-w-screen-xl grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {programs.map((program) => (
            <article
              key={program.title}
              className="overflow-hidden rounded-xl border border-[#c6c5d2] bg-[#fbf8ff] shadow-[0px_1px_2px_#0000000d]"
            >
              <div
                className="relative h-48 w-full bg-cover bg-center"
                style={{ backgroundImage: `url(${program.image})` }}
              >
                <span className="absolute right-4 top-4 rounded-full bg-[#ffffffe6] px-2 py-1 text-xs font-medium tracking-[0.24px] text-[#0b1b62] backdrop-blur-[2px]">
                  {program.age}
                </span>
              </div>
              <div className="min-h-[149px] px-6 pb-10 pt-6">
                <h3 className="text-2xl font-semibold leading-8 text-[#0b1b62]">
                  {program.title}
                </h3>
                <p className="mt-1 text-base leading-6 text-[#454650]">
                  {program.description}
                </p>
              </div>
            </article>
          ))}

          {supportPrograms.map((program) => (
            <article
              key={program.title}
              className="flex min-h-[342px] flex-col justify-center rounded-xl border border-[#c6c5d2] bg-[#fbf8ff] px-6 py-6 shadow-[0px_1px_2px_#0000000d]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="h-5 w-5" src={program.icon} alt="" aria-hidden="true" />
              <h3 className="mt-4 text-2xl font-semibold leading-8 text-[#0b1b62]">
                {program.title}
              </h3>
              <p className="mt-1 text-base leading-6 text-[#454650]">
                {program.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* 6 Domains */}
      <section
        id="domains"
        className="relative flex w-full flex-col items-center overflow-hidden bg-[#0b1b62] px-0 py-12"
        aria-labelledby="domains-heading"
      >
        <div className="relative flex w-full max-w-screen-xl flex-col items-center gap-8 px-6">
          <header className="flex w-full flex-col items-center gap-2">
            <h2
              id="domains-heading"
              className="text-center text-[32px] font-bold leading-10 tracking-[-0.32px] text-white"
            >
              The 6 Domains of Development
            </h2>
            <p className="max-w-2xl text-center text-lg leading-7 text-[#bac3ff]">
              Our holistic approach ensures every aspect of your child&apos;s
              growth is nurtured.
            </p>
          </header>
          <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {domains.map((domain) => (
              <article
                key={domain.title}
                className="min-h-[146px] rounded-xl border border-[#ffffff33] bg-[#ffffff1a] p-6 backdrop-blur-[6px]"
              >
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="h-5 w-5" src={domain.icon} alt="" aria-hidden="true" />
                  <h3 className="text-2xl font-semibold leading-8 text-white">
                    {domain.title}
                  </h3>
                </div>
                <p className="mt-4 text-base leading-6 text-[#bac3ff]">
                  {domain.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}
