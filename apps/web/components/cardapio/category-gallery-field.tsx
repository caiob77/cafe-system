'use client';

import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { CategoryGalleryImage } from '@/features/cardapio/types';
import { ACCEPTED_IMAGE_TYPES, imageVariant, uploadImage } from '@/lib/image-upload';

const MAX_GALLERY = 6;

type CategoryGalleryFieldProps = {
  images: CategoryGalleryImage[];
  onChange: (images: CategoryGalleryImage[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
};

export function CategoryGalleryField({
  images,
  onChange,
  onUploadingChange,
  disabled = false,
}: CategoryGalleryFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = images.length >= MAX_GALLERY;

  function setUploading(next: boolean) {
    setUploadingState(next);
    onUploadingChange?.(next);
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const remaining = MAX_GALLERY - images.length;
    if (remaining <= 0) return;

    setError(null);
    setUploading(true);
    try {
      const next = [...images];
      for (const file of Array.from(files).slice(0, remaining)) {
        const uploaded = await uploadImage(file, 'category');
        next.push({ url: uploaded.url, publicId: uploaded.publicId });
      }
      onChange(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function removeAt(index: number) {
    onChange(images.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-2">
      <Label>Fotos de demonstração</Label>
      <p className="text-xs text-muted-foreground">
        Aparecem na loja pública nesta categoria (ex.: algumas tapiocas). Até {MAX_GALLERY} fotos.
        Não precisa de foto por produto.
      </p>

      {images.length > 0 ? (
        <ul className="grid grid-cols-3 gap-2">
          {images.map((image, index) => (
            <li
              className="relative overflow-hidden rounded-md border bg-muted/40"
              key={`${image.url}-${index}`}
            >
              <img
                alt=""
                className="aspect-[4/3] h-auto w-full object-cover"
                src={imageVariant(image.url, { width: 240, height: 180 })}
              />
              <Button
                className="absolute right-1 top-1 h-8 w-8"
                disabled={disabled || uploading}
                onClick={() => removeAt(index)}
                size="icon"
                type="button"
                variant="secondary"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Remover foto</span>
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <input
        accept={ACCEPTED_IMAGE_TYPES}
        className="sr-only"
        disabled={disabled || uploading || full}
        multiple
        onChange={(event) => void handleFiles(event.target.files)}
        ref={inputRef}
        type="file"
      />
      <Button
        disabled={disabled || uploading || full}
        onClick={() => inputRef.current?.click()}
        type="button"
        variant="secondary"
      >
        {uploading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ImagePlus className="h-4 w-4" />
        )}
        {uploading ? 'Enviando…' : full ? 'Limite atingido' : 'Adicionar fotos'}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
