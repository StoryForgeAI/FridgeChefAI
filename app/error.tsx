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
    <div className="p-4 text-center">
      <h2 className="text-xl font-bold mb-4">Something went wrong!</h2>
      <button
        onClick={() => reset()}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg"
      >
        Try again
      </button>
    </div>
  );
}
