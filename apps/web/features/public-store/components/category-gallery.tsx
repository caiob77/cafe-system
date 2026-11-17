'use client';

import { useState } from 'react';

import { imageVariant } from '@/lib/image-upload';
import { cn } from '@/lib/utils';

import type { PublicStoreGalleryImage } from '../types';

type CategoryGalleryProps = {
  categoryName: string;
  images: PublicStoreGalleryImage[];
};

export function CategoryGallery({ categoryName, images }: CategoryGalleryProps) {
  if (images.length === 0) return null;

  return (
    <section
      aria-label={`Demonstrações de ${categoryName}`}
      className="store-reveal min-w-0 border-b border-[hsl(var(--line))] px-4 py-4 lg:px-8"
    >
      <p className="mb-3 text-sm text-muted-foreground">Como chega à mesa</p>
      <ul
        className={cn(
          'flex w-full min-w-0 gap-3 overflow-x-auto overscroll-x-contain pb-1',
          images.length === 1 && 'justify-start',
          images.length >= 3 && 'lg:grid lg:grid-cols-3 lg:overflow-visible lg:pb-0',
          images.length === 2 && 'lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0',
        )}
      >
        {images.map((image, index) => (
          <GalleryFrame
            alt={`Demonstração de ${categoryName}`}
            key={`${image.url}-${index}`}
            src={image.url}
            tall={images.length === 1}
          />
        ))}
      </ul>
    </section>
  );
}

function GalleryFrame({
  src,
  alt,
  tall,
}: {
  src: string;
  alt: string;
  tall: boolean;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;

  return (
    <li
      className={cn(
        'relative shrink-0 overflow-hidden bg-[hsl(var(--wash))]',
        tall ? 'aspect-[16/10] w-full max-w-xl' : 'aspect-[4/3] w-[min(72vw,18rem)] lg:w-auto',
      )}
    >
      <img
        alt={alt}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setFailed(true)}
        sizes={tall ? '(min-width: 1024px) 560px, 100vw' : '(min-width: 1024px) 200px, 72vw'}
        src={imageVariant(src, { width: tall ? 960 : 480, height: tall ? 600 : 360 })}
      />
    </li>
  );
}
