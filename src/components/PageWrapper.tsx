'use client';

interface PageWrapperProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export function PageWrapper({ children, title, className = '' }: PageWrapperProps) {
  return (
    <div className={`min-h-screen px-6 py-10 lg:px-10 lg:py-12 animate-fade-in ${className}`}>
      <div className="mx-auto max-w-6xl">
        {title && (
          <h1 className="mb-10 font-heading text-3xl font-semibold text-white">
            {title}
          </h1>
        )}
        {children}
      </div>
    </div>
  );
}
