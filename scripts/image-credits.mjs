import {readFile, writeFile, readdir} from 'node:fs/promises';
const registry=JSON.parse(await readFile('docs/image-sources.json','utf8'));
const images=JSON.parse(await readFile('src/data/images.json','utf8'));
const lines=['糖葫芦 · 图片来源与权利说明','图片用于对应作品、产品和作者条目的识别与介绍。除明确标注的开放许可外，版权及商标权归原权利人。',''];
for(const entry of registry.items.filter(entry=>images[entry.id]).sort((a,b)=>a.id.localeCompare(b.id))) {
 const image=images[entry.id];
 lines.push(entry.id,`显示文件: ${image.src}`,`来源: ${entry.sourcePage}`,`原图: ${entry.sourceUrl}`, ...(entry.archiveMember ? [`封面提取位置: ${entry.archiveMember}`] : []),`说明: ${entry.rights}`, ...(entry.credit?[`作者: ${entry.credit}`,`许可: ${entry.license} ${entry.licenseUrl}`,`处理: ${image.transformation}`]:[]),'');
}
for(const file of (await readdir('docs/licenses')).sort()) lines.push(`=== ${file} ===`,await readFile(`docs/licenses/${file}`,'utf8'),'');
await writeFile('public/images/ATTRIBUTION.txt',lines.join('\n').trimEnd() + '\n');
