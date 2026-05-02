import type { Metadata } from 'next';
import './globals.css';
import BottomNav from '@/components/ui/BottomNav';

export const metadata: Metadata = {
  title: 'FridgeChef AI',
  description: 'AI-powered recipe generator from your pantry',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen max-w-md mx-auto">
        <main className="pb-20">{children}</main>
        <BottomNav />
      </body>
    </html>
  );
}
