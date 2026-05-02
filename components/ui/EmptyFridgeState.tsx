import Link from 'next/link';
import { Refrigerator, ScanSearch } from 'lucide-react';

export default function EmptyFridgeState({
  title,
  copy,
  ctaHref,
  ctaLabel
}: {
  title: string;
  copy: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <div className="panel overflow-hidden p-8 text-center">
      <div className="mx-auto flex h-28 w-24 items-center justify-center rounded-[2rem] border border-yellow-400/20 bg-yellow-400/10 shadow-lg shadow-yellow-500/10">
        <div className="relative flex h-20 w-14 flex-col rounded-[1.5rem] border border-yellow-300/50 bg-[#111111]">
          <div className="mx-3 mt-3 h-5 rounded-full border border-yellow-300/30" />
          <div className="mx-2 mt-3 h-px bg-yellow-300/25" />
          <div className="mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full border border-yellow-300/25 bg-yellow-400/5">
            <Refrigerator className="h-4 w-4 text-yellow-300" />
          </div>
        </div>
      </div>
      <h2 className="mt-6 text-2xl font-semibold text-white">{title}</h2>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-zinc-400">{copy}</p>
      <Link href={ctaHref} className="glow-button mt-6 gap-2">
        <ScanSearch className="h-4 w-4" />
        {ctaLabel}
      </Link>
    </div>
  );
}
