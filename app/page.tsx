import Link from 'next/link';
import { ArrowRight, AudioLines, Barcode, BrainCircuit, Flame, ShieldCheck, ChevronDown, Users } from 'lucide-react';
import { STRIPE_TIERS } from '@/lib/types';

const featureCards = [
  {
    icon: Barcode,
    title: 'Barcode Scanning',
    copy: 'Turn everyday groceries into structured pantry data with a scanner-first mobile flow.'
  },
  {
    icon: Flame,
    title: 'Macro Tracking',
    copy: 'Watch calories, pantry volume, and usage patterns without leaving the app shell.'
  },
  {
    icon: AudioLines,
    title: 'Chef Tutorials',
    copy: 'Open guided recipe walkthroughs with bold sections, audio playback, and scroll progress.'
  }
];

const userAvatars = [
  { initials: 'JD', color: 'bg-blue-500' },
  { initials: 'SK', color: 'bg-green-500' },
  { initials: 'ML', color: 'bg-purple-500' },
  { initials: 'AP', color: 'bg-pink-500' },
  { initials: 'RK', color: 'bg-yellow-500' },
  { initials: 'TM', color: 'bg-red-500' },
  { initials: 'LN', color: 'bg-indigo-500' },
  { initials: 'OW', color: 'bg-teal-500' }
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(255,215,0,0.08),_transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_rgba(255,215,0,0.05),_transparent_50%)]" />
        <div className="absolute inset-0 bg-grid-white/[0.02] bg-[length:50px_50px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Hero Section */}
        <section className="flex min-h-[80vh] flex-col items-center justify-center text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm text-yellow-200">
            <BrainCircuit className="h-4 w-4" />
            Premium kitchen intelligence
          </div>
          
          <h1 className="max-w-4xl text-5xl font-semibold tracking-tight text-white sm:text-6xl lg:text-7xl">
            Your Fridge, Reimagined by AI.
          </h1>
          
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400">
            FridgeChef AI blends barcode detection, macro-aware recipe generation, and guided chef tutorials into a
            single premium mobile experience.
          </p>
          
          <div className="mt-10 flex flex-col gap-4 sm:flex-row sm:gap-3">
            <Link href="#info-section" className="secondary-button gap-2">
              See More
              <ChevronDown className="h-4 w-4" />
            </Link>
            <Link href="/login" className="glow-button gap-2 text-base px-8 py-4">
              Get Started
              <ArrowRight className="h-5 w-5" />
            </Link>
          </div>

          {/* User count section */}
          <div className="mt-16 flex flex-col items-center gap-4">
            <div className="flex -space-x-3">
              {userAvatars.map((user, i) => (
                <div
                  key={i}
                  className={`flex h-10 w-10 items-center justify-center rounded-full ${user.color} text-sm font-semibold text-white ring-2 ring-zinc-950`}
                  style={{ zIndex: userAvatars.length - i }}
                >
                  {user.initials}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <Users className="h-4 w-4 text-yellow-300" />
              <span>Join <span className="font-semibold text-yellow-300">100K+</span> happy users</span>
            </div>
          </div>
        </section>

        {/* Info Section - appears after See More */}
        <section id="info-section" className="mt-20 space-y-8 pb-20">
          <div className="text-center">
            <h2 className="text-3xl font-semibold text-white sm:text-4xl">Why Choose FridgeChef?</h2>
            <p className="mt-4 text-zinc-400">Everything you need for a smarter kitchen experience</p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureCards.map(({ icon: Icon, title, copy }) => (
              <article key={title} className="panel p-6 transition-all hover:border-yellow-400/30">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10">
                  <Icon className="h-7 w-7 text-yellow-300" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-white">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
              </article>
            ))}
          </div>

          {/* Responsive mockup section */}
          <div className="mt-16 grid gap-8 lg:grid-cols-2">
            <div className="panel p-6">
              <div className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
                <Barcode className="h-4 w-4 text-yellow-300" />
                Mobile Experience
              </div>
              <div className="aspect-[9/16] max-w-xs mx-auto rounded-[2rem] border-4 border-zinc-800 bg-zinc-950 p-4">
                <div className="h-full rounded-[1.5rem] bg-zinc-900 p-3">
                  <div className="h-full rounded-2xl bg-black/50 flex items-center justify-center">
                    <div className="text-center">
                      <Barcode className="mx-auto h-12 w-12 text-yellow-300/50" />
                      <p className="mt-3 text-sm text-zinc-500">Scan barcodes instantly</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="panel p-6">
              <div className="mb-4 flex items-center gap-2 text-sm text-zinc-300">
                <Flame className="h-4 w-4 text-yellow-300" />
                Desktop Dashboard
              </div>
              <div className="aspect-video rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="h-full rounded-xl bg-zinc-900 p-4">
                  <div className="grid h-full grid-cols-2 gap-3">
                    <div className="rounded-lg bg-black/30 p-3">
                      <p className="text-xs text-zinc-500">Pantry Items</p>
                      <p className="mt-2 text-lg font-semibold text-white">24</p>
                    </div>
                    <div className="rounded-lg bg-black/30 p-3">
                      <p className="text-xs text-zinc-500">Calories</p>
                      <p className="mt-2 text-lg font-semibold text-white">1,240</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="mt-20 pb-20">
          <div className="mb-8 flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-yellow-300/75">
            <ShieldCheck className="h-4 w-4" />
            Pricing
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {(['standard', 'pro', 'chef'] as const).map((tier) => {
              const config = STRIPE_TIERS[tier];
              return (
                <article
                  key={tier}
                  className={`panel p-6 ${tier === 'chef' ? 'border-yellow-400/30 bg-yellow-400/10' : ''}`}
                >
                  <p className="text-sm uppercase tracking-[0.22em] text-yellow-300/70">{config.label}</p>
                  <div className="mt-4 flex items-end gap-2">
                    <span className="text-4xl font-semibold text-white">${config.price}</span>
                    <span className="pb-1 text-zinc-500">/ month</span>
                  </div>
                  <div className="mt-6 space-y-3 text-sm text-zinc-300">
                    <p>{config.credits} credits</p>
                    <p>{config.tss_credits} TSS credits</p>
                    <p>{Math.round(config.discount * 100)}% discount on credit costs</p>
                    <p>{config.itemLimit} pantry items</p>
                    <p>{config.recipeSuggestions} recipe suggestions</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
