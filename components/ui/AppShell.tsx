'use client';

import { usePathname } from 'next/navigation';
import BottomNav from './BottomNav';
import CreditsDock from './CreditsDock';

const appRoutes = ['/home', '/scanner', '/stats', '/profile'];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAppRoute = appRoutes.some((route) => pathname === route) || pathname.startsWith('/recipe/');
  const isMarketingRoute = pathname === '/' || pathname.startsWith('/login');

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#0A0A0A] text-zinc-50">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,215,0,0.14),_transparent_30%),radial-gradient(circle_at_bottom,_rgba(234,179,8,0.12),_transparent_24%)]" />
      <div className="pointer-events-none fixed inset-x-0 top-0 h-56 bg-gradient-to-b from-yellow-400/8 to-transparent" />
      {isAppRoute ? <CreditsDock /> : null}
      <main
        className={
          isMarketingRoute
            ? 'relative mx-auto min-h-screen max-w-6xl px-4 pb-12 sm:px-6 lg:px-8'
            : `relative mx-auto min-h-screen w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${isAppRoute ? 'pb-28 pt-24 sm:pt-28' : 'pb-10 pt-4'}`
        }
      >
        {children}
      </main>
      {isAppRoute ? <BottomNav /> : null}
    </div>
  );
}
