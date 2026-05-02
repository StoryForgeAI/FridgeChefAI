import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import AuthPanel from '@/components/auth/AuthPanel';

export default function LoginPage() {
  return (
    <div className="py-8">
      <Link href="/" className="mb-6 inline-flex items-center gap-2 text-sm text-zinc-400 hover:text-yellow-200">
        <ChevronLeft className="h-4 w-4" />
        Back to landing
      </Link>
      <AuthPanel />
    </div>
  );
}
