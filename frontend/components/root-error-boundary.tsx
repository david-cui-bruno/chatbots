'use client';

import React from 'react';

export function RootErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = React.useState(false);

  if (hasError) {
    return (
      <div className="p-4 text-center">
        <p>Something went wrong. Please refresh the page.</p>
        <button onClick={() => setHasError(false)}>Try Again</button>
      </div>
    );
  }

  return <>{children}</>;
} 