export type Category =
  | 'film' | 'book' | 'tool' | 'health' | 'podcast'
  | 'social' | 'communication' | 'car' | 'camera' | 'creator' | 'video'
  | 'other';

export interface CategoryConfig {
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  tint: string;
  color: string;
  bg: string;
  cardPlaceholder: string;
  detailPlaceholder: string;
}

export const categoryConfig: Record<string, CategoryConfig> = {
  film:          { label: '电影', shortLabel: '看', description: '值得留一个晚上的光影与故事', accent: '#c65f3b', tint: '#f4ded2', color: 'text-orange-700', bg: 'bg-orange-50', cardPlaceholder: 'bg-orange-100 text-orange-500', detailPlaceholder: 'bg-orange-100 text-orange-400' },
  book:          { label: '书籍', shortLabel: '读', description: '读完以后，仍会在脑中停留的文字', accent: '#56735b', tint: '#dfe9dd', color: 'text-green-800', bg: 'bg-green-50', cardPlaceholder: 'bg-green-100 text-green-600', detailPlaceholder: 'bg-green-100 text-green-500' },
  tool:          { label: '工具', shortLabel: '用', description: '真正提高效率，而不是制造焦虑的工具', accent: '#456d8c', tint: '#dbe8ef', color: 'text-blue-800', bg: 'bg-blue-50', cardPlaceholder: 'bg-blue-100 text-blue-600', detailPlaceholder: 'bg-blue-100 text-blue-500' },
  health:        { label: '健康', shortLabel: '养', description: '让身体和生活慢慢变好的方法', accent: '#a34f62', tint: '#f1dde2', color: 'text-rose-800', bg: 'bg-rose-50', cardPlaceholder: 'bg-rose-100 text-rose-600', detailPlaceholder: 'bg-rose-100 text-rose-500' },
  podcast:       { label: '播客', shortLabel: '听', description: '适合走路、通勤和独处时听的声音', accent: '#aa792d', tint: '#f2e5c9', color: 'text-amber-800', bg: 'bg-amber-50', cardPlaceholder: 'bg-amber-100 text-amber-600', detailPlaceholder: 'bg-amber-100 text-amber-500' },
  social:        { label: '社交', shortLabel: '联', description: '人与人保持连接的产品与社区', accent: '#a45473', tint: '#efdee5', color: 'text-pink-800', bg: 'bg-pink-50', cardPlaceholder: 'bg-pink-100 text-pink-600', detailPlaceholder: 'bg-pink-100 text-pink-500' },
  communication: { label: '通讯', shortLabel: '聊', description: '跨过距离，把话好好说出去', accent: '#477788', tint: '#dce9eb', color: 'text-sky-800', bg: 'bg-sky-50', cardPlaceholder: 'bg-sky-100 text-sky-600', detailPlaceholder: 'bg-sky-100 text-sky-500' },
  car:           { label: '汽车', shortLabel: '行', description: '关于移动、驾驶和路上的体验', accent: '#5e6870', tint: '#e1e4e5', color: 'text-slate-800', bg: 'bg-slate-50', cardPlaceholder: 'bg-slate-100 text-slate-600', detailPlaceholder: 'bg-slate-100 text-slate-500' },
  camera:        { label: '相机', shortLabel: '拍', description: '让人更愿意观察与记录的器材', accent: '#655f5b', tint: '#e5e1dd', color: 'text-zinc-800', bg: 'bg-zinc-50', cardPlaceholder: 'bg-zinc-100 text-zinc-600', detailPlaceholder: 'bg-zinc-100 text-zinc-500' },
  creator:       { label: '创作者', shortLabel: '人', description: '值得长期关注的人与他们的表达', accent: '#735b87', tint: '#e7deed', color: 'text-violet-800', bg: 'bg-violet-50', cardPlaceholder: 'bg-violet-100 text-violet-600', detailPlaceholder: 'bg-violet-100 text-violet-500' },
  video:         { label: '视频', shortLabel: '观', description: '屏幕上那些值得看完的长短内容', accent: '#a54b43', tint: '#efddd9', color: 'text-red-800', bg: 'bg-red-50', cardPlaceholder: 'bg-red-100 text-red-600', detailPlaceholder: 'bg-red-100 text-red-500' },
  other:         { label: '其他', shortLabel: '藏', description: '暂时放不进抽屉，但舍不得错过的东西', accent: '#79617f', tint: '#e9dfea', color: 'text-purple-800', bg: 'bg-purple-50', cardPlaceholder: 'bg-purple-100 text-purple-600', detailPlaceholder: 'bg-purple-100 text-purple-500' },
};

// 主导航和首页 tab 展示的分类
export const visibleCategories = ['film', 'book', 'tool', 'health', 'podcast'] as const;

// 所有分类（包括隐藏）
export const allCategories = Object.keys(categoryConfig) as Category[];
