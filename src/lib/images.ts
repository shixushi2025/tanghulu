import registry from '../data/images.json';
export interface ImageMetadata {
  src: string;
  width: number;
  height: number;
  bytes: number;
  kind: 'logo' | 'book' | 'poster' | 'photo' | 'artwork';
  alt: string;
  edition: string;
  sourcePage: string;
  provider: string;
  credit?: string;
  license?: string;
  licenseUrl?: string;
  transformation?: string;
}
const bySource = new Map(Object.values(registry).map(image => [image.src, image as ImageMetadata]));
// Match the actual image, not just the item ID: admin replacements must not inherit an unrelated credit.
export function imageMetadata(src: string | undefined): ImageMetadata | undefined {
  return src ? bySource.get(src) : undefined;
}
