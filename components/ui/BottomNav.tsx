'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Home', icon: '🏠' },
  { href: '/scanner', label: 'Scanner', icon: '📷' },
  { href: '/stats', label: 'Stats', icon: '📊' },
  { href: '/profile', label: 'Profile', icon: '👤' }
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 max-w-md mx-auto">
      <div className="flex justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center py-1 px-3 text-xs ${
              pathname === item.href ? 'text-blue-600' : 'text-gray-500'
            }`}
          >
            <span className="text-xl mb-1">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
