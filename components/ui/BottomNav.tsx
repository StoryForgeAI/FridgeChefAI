'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, House, ScanLine, UserCircle2 } from 'lucide-react';

const navItems = [
  { href: '/home', label: 'Home', icon: House },
  { href: '/scanner', label: 'Scanner', icon: ScanLine },
  { href: '/stats', label: 'Stats', icon: BarChart3 },
  { href: '/profile', label: 'Profile', icon: UserCircle2 }
];

export default function BottomNav() {
  const pathname = usePathname();

  const showNav = navItems.some((item) => pathname === item.href) || pathname.startsWith('/recipe/');
  if (!showNav) {
    return null;
  }

  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[calc(100%-1.5rem)] max-w-md">
      <div className="rounded-[1.75rem] border border-white/10 bg-zinc-950/70 px-2 py-2 shadow-2xl shadow-yellow-500/10 backdrop-blur-xl">
        <div className="flex justify-around">
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

  return (
    <Link
      href={item.href}
      className={`flex min-w-[72px] flex-col items-center rounded-2xl px-3 py-2 text-[11px] font-medium transition ${
        active
          ? 'bg-yellow-400/12 text-yellow-300 shadow-lg shadow-yellow-500/20'
          : 'text-zinc-500 hover:text-zinc-100'
      }`}
    >
      <Icon className={`mb-1 h-5 w-5 ${active ? 'text-yellow-300' : 'text-zinc-400'}`} strokeWidth={2.1} />
      {item.label}
    </Link>
  );
}
