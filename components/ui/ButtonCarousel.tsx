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
  return (
    <div className="marquee">
      <div className="marquee-track">
        {items.map((item) => (
          <ButtonCard
            key={item.href}
            title={item.title}
            href={item.href}
            icon={item.icon}
            delay="0ms"
          />
        ))}
        {items.map((item) => (
          <ButtonCard
            key={item.href + "-clone"}
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
