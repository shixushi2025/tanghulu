export type Category =
  | 'film' | 'book' | 'tool' | 'health' | 'podcast'
  | 'social' | 'communication' | 'car' | 'camera' | 'creator' | 'video'
  | 'other';

export interface CategoryConfig {
  label: string;
  color: string;
  bg: string;
  cardPlaceholder: string;
  detailPlaceholder: string;
}

export const categoryConfig: Record<string, CategoryConfig> = {
  film:          { label: '电影',    color: 'text-orange-600', bg: 'bg-orange-50',  cardPlaceholder: 'bg-orange-100 text-orange-400',  detailPlaceholder: 'bg-orange-100 text-orange-300' },
  book:          { label: '书籍',    color: 'text-green-600',  bg: 'bg-green-50',   cardPlaceholder: 'bg-green-100 text-green-400',    detailPlaceholder: 'bg-green-100 text-green-300' },
  tool:          { label: 'AI 工具', color: 'text-blue-600',   bg: 'bg-blue-50',    cardPlaceholder: 'bg-blue-100 text-blue-400',      detailPlaceholder: 'bg-blue-100 text-blue-300' },
  health:        { label: '健康',    color: 'text-rose-600',   bg: 'bg-rose-50',    cardPlaceholder: 'bg-rose-100 text-rose-400',      detailPlaceholder: 'bg-rose-100 text-rose-300' },
  podcast:       { label: '播客',    color: 'text-amber-600',  bg: 'bg-amber-50',   cardPlaceholder: 'bg-amber-100 text-amber-400',    detailPlaceholder: 'bg-amber-100 text-amber-300' },
  social:        { label: '社交',    color: 'text-pink-600',   bg: 'bg-pink-50',    cardPlaceholder: 'bg-pink-100 text-pink-400',      detailPlaceholder: 'bg-pink-100 text-pink-300' },
  communication: { label: '通讯',    color: 'text-sky-600',    bg: 'bg-sky-50',     cardPlaceholder: 'bg-sky-100 text-sky-400',        detailPlaceholder: 'bg-sky-100 text-sky-300' },
  car:           { label: '汽车',    color: 'text-slate-600',  bg: 'bg-slate-50',   cardPlaceholder: 'bg-slate-100 text-slate-400',    detailPlaceholder: 'bg-slate-100 text-slate-300' },
  camera:        { label: '相机',    color: 'text-zinc-600',   bg: 'bg-zinc-50',    cardPlaceholder: 'bg-zinc-100 text-zinc-400',      detailPlaceholder: 'bg-zinc-100 text-zinc-300' },
  creator:       { label: '博主',    color: 'text-violet-600', bg: 'bg-violet-50',  cardPlaceholder: 'bg-violet-100 text-violet-400',  detailPlaceholder: 'bg-violet-100 text-violet-300' },
  video:         { label: '视频',    color: 'text-red-600',    bg: 'bg-red-50',     cardPlaceholder: 'bg-red-100 text-red-400',        detailPlaceholder: 'bg-red-100 text-red-300' },
  other:         { label: '其他',    color: 'text-purple-600', bg: 'bg-purple-50',  cardPlaceholder: 'bg-purple-100 text-purple-400',  detailPlaceholder: 'bg-purple-100 text-purple-300' },
};

// 主导航和首页 tab 展示的分类
export const visibleCategories = ['film', 'book', 'tool', 'health', 'podcast'] as const;

// 所有分类（包括隐藏）
export const allCategories = Object.keys(categoryConfig) as Category[];
