'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="panel p-6 text-center">
      <h2 className="mb-4 text-xl font-bold text-white">Something went wrong!</h2>
      <button
        onClick={() => reset()}
        className="glow-button"
      >
        Try again
      </button>
    </div>
  );
}
