import { useState } from 'react';
import { BookOpen } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  fallbackTitle?: string;
}

export function ImageWithFallback({
  src,
  alt,
  className = '',
  fallbackTitle,
}: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-[#e5deff] via-[#f5f3ff] to-[#e0e7ff] dark:from-[#261b47] dark:via-[#1c1436] dark:to-[#1e1b4b] text-[#442cb2] dark:text-[#c4b5fd] p-6 ${className}`}
        role="img"
        aria-label={alt}
      >
        <BookOpen className="w-8 h-8 mb-2 opacity-80" aria-hidden="true" />
        {fallbackTitle ? (
          <span className="text-xs font-medium text-center opacity-80">{fallbackTitle}</span>
        ) : null}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
