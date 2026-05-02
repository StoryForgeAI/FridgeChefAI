'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, House, ScanLine, ScrollText, UserCircle2 } from 'lucide-react';

const navItems = [
  { href: '/home', label: 'Home', icon: House, variant: 'default' as const },
  { href: '/recipes', label: 'Recipes', icon: ScrollText, variant: 'default' as const },
  { href: '/scanner', label: 'Scan', icon: ScanLine, variant: 'center' as const },
  { href: '/stats', label: 'Stats', icon: BarChart3, variant: 'default' as const },
  { href: '/profile', label: 'Profile', icon: UserCircle2, variant: 'default' as const }
];

export default function BottomNav() {
  const pathname = usePathname();

  const showNav = navItems.some((item) => pathname === item.href) || pathname.startsWith('/recipe/');
  if (!showNav) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[calc(100%-1rem)] max-w-md sm:w-[calc(100%-2rem)]">
      <div className="rounded-[2rem] border border-white/10 bg-zinc-950/75 px-2 py-2 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl">
        <div className="grid grid-cols-5 items-end gap-1">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} active={pathname === item.href} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  item,
  active
}: {
  item: (typeof navItems)[number];
  active: boolean;
}) {
  const Icon = item.icon;

  if (item.variant === 'center') {
    return (
      <div className="flex justify-center">
        <Link
          href={item.href}
          className={`-mt-7 flex h-16 w-16 flex-col items-center justify-center rounded-[1.7rem] border text-[11px] font-semibold transition ${
            active
              ? 'border-yellow-300 bg-yellow-400 text-black shadow-2xl shadow-yellow-500/30'
              : 'border-yellow-400/30 bg-yellow-400/90 text-black shadow-xl shadow-yellow-500/20 hover:bg-yellow-300'
          }`}
        >
          <Icon className="mb-1 h-5 w-5" strokeWidth={2.2} />
          {item.label}
        </Link>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={`flex min-w-0 flex-col items-center rounded-2xl px-2 py-2 text-[10px] font-medium transition ${
        active
          ? 'bg-yellow-400/12 text-yellow-300 shadow-lg shadow-yellow-500/20'
          : 'text-zinc-500 hover:text-zinc-100'
      }`}
    >
      <Icon className={`mb-1 h-[18px] w-[18px] ${active ? 'text-yellow-300' : 'text-zinc-400'}`} strokeWidth={2.1} />
      {item.label}
    </Link>
  );
}
