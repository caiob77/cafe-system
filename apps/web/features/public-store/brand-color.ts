const LIGHT_FOREGROUND = '38 41% 95%';
const DARK_FOREGROUND = '24 22% 9%';

const VARIABLE_KEYS = [
  '--primary',
  '--accent',
  '--ring',
  '--primary-foreground',
  '--accent-foreground',
] as const;

export const DEFAULT_BRAND_COLOR = '#2C1810';

export function parseBrandHex(value: string | null | undefined) {
  if (!value) return null;
  const match = /^#([0-9a-fA-F]{6})$/.exec(value.trim());
  const hex = match?.[1];
  return hex ? `#${hex.toUpperCase()}` : null;
}

function linearChannel(value: number) {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

function hexToHslChannels(hex: string) {
  const int = Number.parseInt(hex.slice(1), 16);
  const red = ((int >> 16) & 255) / 255;
  const green = ((int >> 8) & 255) / 255;
  const blue = (int & 255) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  let hue = 0;
  let saturation = 0;

  if (delta !== 0) {
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
    if (max === red) hue = (green - blue) / delta + (green < blue ? 6 : 0);
    else if (max === green) hue = (blue - red) / delta + 2;
    else hue = (red - green) / delta + 4;
    hue /= 6;
  }

  return `${Math.round(hue * 360)} ${Math.round(saturation * 100)}% ${Math.round(lightness * 100)}%`;
}

export function brandColorVariables(value: string | null | undefined) {
  const hex = parseBrandHex(value);
  if (!hex) return null;

  const int = Number.parseInt(hex.slice(1), 16);
  const luminance =
    0.2126 * linearChannel((int >> 16) & 255) +
    0.7152 * linearChannel((int >> 8) & 255) +
    0.0722 * linearChannel(int & 255);
  const foreground = luminance > 0.45 ? DARK_FOREGROUND : LIGHT_FOREGROUND;
  const channels = hexToHslChannels(hex);

  return {
    '--primary': channels,
    '--accent': channels,
    '--ring': channels,
    '--primary-foreground': foreground,
    '--accent-foreground': foreground,
  };
}

export function applyBrandColor(node: HTMLElement, value: string | null | undefined) {
  const variables = brandColorVariables(value);
  if (!variables) {
    for (const key of VARIABLE_KEYS) node.style.removeProperty(key);
    return;
  }

  for (const [key, cssValue] of Object.entries(variables)) {
    node.style.setProperty(key, cssValue);
  }
}
