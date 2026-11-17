'use client';

import type { UploadKind } from '@cafe/shared';
import { ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ACCEPTED_IMAGE_TYPES, imageVariant, uploadImage } from '@/lib/image-upload';
import { cn } from '@/lib/utils';

type ImageUploadFieldProps = {
  id: string;
  label: string;
  kind: UploadKind;
  value: string;
  /** `publicId` é null quando a imagem veio de URL colada ou foi removida. */
  onChange: (image: { url: string; publicId: string | null }) => void;
  onUploadingChange?: (uploading: boolean) => void;
  hint?: string;
  disabled?: boolean;
};

export function ImageUploadField({
  id,
  label,
  kind,
  value,
  onChange,
  onUploadingChange,
  hint,
  disabled = false,
}: ImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploadingState] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const wide = kind === 'banner';
  const url = value.trim();

  function setUploading(next: boolean) {
    setUploadingState(next);
    onUploadingChange?.(next);
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded = await uploadImage(file, kind);
      setPreviewFailed(false);
      onChange({ url: uploaded.url, publicId: uploaded.publicId });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível enviar a imagem.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex flex-wrap items-center gap-3">
        <div
          className={cn(
            'flex shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/40 text-muted-foreground',
            wide ? 'h-20 w-40' : 'h-20 w-20',
          )}
        >
          {url && !previewFailed ? (
            <img
              alt=""
              className="h-full w-full object-cover"
              onError={() => setPreviewFailed(true)}
              src={imageVariant(
                url,
                wide ? { width: 320, height: 160 } : { width: 160, height: 160 },
              )}
            />
          ) : (
            <ImagePlus aria-hidden className="h-6 w-6" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            accept={ACCEPTED_IMAGE_TYPES}
            className="sr-only"
            disabled={disabled || uploading}
            id={id}
            onChange={(event) => void handleFile(event.target.files?.[0])}
            ref={inputRef}
            type="file"
          />
          <Button
            disabled={disabled || uploading}
            onClick={() => inputRef.current?.click()}
            type="button"
            variant="secondary"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-4 w-4" />
            )}
            {uploading ? 'Enviando…' : url ? 'Trocar imagem' : 'Enviar imagem'}
          </Button>
          {url ? (
            <Button
              disabled={disabled || uploading}
              onClick={() => {
                setError(null);
                onChange({ url: '', publicId: null });
              }}
              type="button"
              variant="ghost"
            >
              <Trash2 className="h-4 w-4" />
              Remover
            </Button>
          ) : null}
        </div>
      </div>
      <Input
        aria-label={`${label}: URL`}
        disabled={disabled || uploading}
        onChange={(event) => {
          setPreviewFailed(false);
          onChange({ url: event.target.value, publicId: null });
        }}
        placeholder="ou cole uma URL https://…"
        value={value}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
