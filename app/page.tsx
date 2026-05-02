import Link from 'next/link';
import { ArrowRight, AudioLines, Barcode, BrainCircuit, Flame, ShieldCheck } from 'lucide-react';
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

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col justify-center py-8">
      <section className="grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
        <div className="panel overflow-hidden p-8 sm:p-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-yellow-400/20 bg-yellow-400/10 px-4 py-2 text-sm text-yellow-200">
            <BrainCircuit className="h-4 w-4" />
            Premium kitchen intelligence
          </div>
          <h1 className="max-w-3xl text-5xl font-semibold tracking-tight text-white sm:text-6xl">
            Your Fridge, Reimagined by AI.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-400">
            FridgeChef AI blends barcode detection, macro-aware recipe generation, and guided chef tutorials into a
            single premium mobile experience.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="glow-button gap-2">
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="#pricing" className="secondary-button">
              Explore Plans
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          {featureCards.map(({ icon: Icon, title, copy }) => (
            <article key={title} className="panel p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-yellow-400/20 bg-yellow-400/10">
                <Icon className="h-6 w-6 text-yellow-300" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold text-white">{title}</h2>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="pricing" className="mt-10">
        <div className="mb-6 flex items-center gap-2 text-sm uppercase tracking-[0.28em] text-yellow-300/75">
          <ShieldCheck className="h-4 w-4" />
          Pricing
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
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
  );
}
