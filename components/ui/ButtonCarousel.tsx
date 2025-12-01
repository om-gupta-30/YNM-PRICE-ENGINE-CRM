'use client';

import ButtonCard from './ButtonCard';

interface ButtonCarouselProps {
  items: Array<{
    title: string;
    href: string;
    icon?: string;
  }>;
}

export default function ButtonCarousel({ items }: ButtonCarouselProps) {
  // Horizontal thin bars stacked vertically - allows full text to fit
  // Mobile-friendly with proper spacing
  return (
    <div className="w-full max-w-5xl mx-auto px-2 sm:px-4">
      <div className="flex flex-col gap-2 sm:gap-3 md:gap-4">
        {items.map((item) => (
          <ButtonCard
            key={item.href}
            title={item.title}
            href={item.href}
            icon={item.icon}
            delay="0ms"
          />
        ))}
      </div>
    </div>
  );
}
