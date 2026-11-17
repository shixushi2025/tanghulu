import { imageMetadata } from './images';
import { isHttpUrl } from './validation';

export interface ItemMetadataSource { id: string; title: string; summary: string; cover: string }
export function itemMetadata(item: ItemMetadataSource) {
  const origin = 'https://tanghulu.life';
  const known = imageMetadata(item.cover);
  const local = /^\/images\/covers\/[a-z0-9-]+\.webp$/.test(item.cover);
  const remote = item.cover.startsWith('https://') && isHttpUrl(item.cover);
  const hasCover = local || remote;
  return {
    title: `${item.title} · 糖葫芦`,
    description: item.summary,
    canonical: new URL(`/item/${encodeURIComponent(item.id)}`, origin).href,
    image: new URL(hasCover ? item.cover : '/og.png', origin).href,
    imageAlt: hasCover ? known?.alt ?? `${item.title}封面` : '糖葫芦 · 把真正值得的，串在一起',
    width: hasCover ? known?.width : 1536,
    height: hasCover ? known?.height : 1024,
    card: known?.kind === 'logo' ? 'summary' : 'summary_large_image',
  };
}
