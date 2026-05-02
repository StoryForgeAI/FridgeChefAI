'use client';
import BottomNav from '@/components/ui/BottomNav';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <>
      <main className="pb-20">{children}</main>
      <BottomNav />
    </>
  );
}
