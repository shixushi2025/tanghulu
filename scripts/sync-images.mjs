import { readFile, writeFile, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import sharp from 'sharp';

// Only fetch the reviewed, explicit URLs in the manifest. Never run on a web request.
const run = promisify(execFile);
const registry = JSON.parse(await readFile('docs/image-sources.json', 'utf8'));
const directory = await mkdtemp(join(tmpdir(), 'tanghulu-images-'));
const output = JSON.parse(await readFile('src/data/images.json', 'utf8').catch(() => '{}'));
const selected = process.argv.slice(2);
const failures = [];
await mkdir('public/images/covers', { recursive: true });
await mkdir('src/data', { recursive: true });
try {
  const queue = registry.items.filter(entry => !selected.length || selected.includes(entry.id));
  async function worker() {
    while (queue.length) {
      const entry = queue.shift();
      try {
        if (!/^[a-z0-9-]+$/.test(entry.id)) throw new Error('Invalid ID');
        const url = new URL(entry.sourceUrl);
        if (url.protocol !== 'https:' || url.username || url.password) throw new Error('HTTPS source required');
        const input = join(directory, entry.id);
        await run('curl', ['--fail', '--location', '--proto', '=https', '--proto-redir', '=https', '--max-redirs', '4', '--max-time', '25', '--max-filesize', '8388608', '--silent', '--show-error', '--output', input, url.href], { timeout: 30000, maxBuffer: 100000 });
        let bytes = await readFile(input);
        if (entry.archiveMember) {
          if (!/^[a-zA-Z0-9/_ .-]+\.(png|jpe?g|webp)$/.test(entry.archiveMember) || entry.archiveMember.includes('..')) throw new Error('Invalid EPUB cover member');
          const extracted = await run('unzip', ['-p', input, entry.archiveMember], { encoding: 'buffer', timeout: 5000, maxBuffer: 8388608 });
          bytes = extracted.stdout;
        }
        if (bytes.length > 8388608) throw new Error('Image exceeds 8 MiB');
        const svg = bytes.toString('utf8');
        if (/<svg[\s>]/i.test(svg) && /<(?:script|foreignObject)\b|\son\w+\s*=|(?:href|url)\s*=?\s*["'(]*\s*(?:https?:|\/\/)/i.test(svg)) throw new Error('SVG contains active/external content');
        const source = sharp(bytes, { limitInputPixels: 24000000 });
        const meta = await source.metadata();
        if (!meta.width || !meta.height || (meta.format !== 'svg' && Math.min(meta.width, meta.height) < 48)) throw new Error(`Image too small: ${meta.width}×${meta.height}`);
        let result;
        if (entry.storage === 'external') {
          result = { src: entry.sourceUrl, width: meta.width, height: meta.height, bytes: bytes.length };
        } else {
          const size = entry.kind === 'logo' ? 384 : 720;
          const { data, info } = await sharp(bytes, { limitInputPixels: 24000000, density: meta.format === 'svg' ? 1152 : 72 }).rotate().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer({ resolveWithObject: true });
          const hash = createHash('sha256').update(data).digest('hex').slice(0, 12);
          const src = `/images/covers/${entry.id}-${hash}.webp`;
          await writeFile(`public${src}`, data);
          result = { src, width: info.width, height: info.height, bytes: info.size };
        }
        output[entry.id] = { ...result, kind: entry.kind, alt: entry.alt, edition: entry.edition, sourcePage: entry.sourcePage, provider: entry.provider, ...(entry.credit ? { credit: entry.credit, license: entry.license, licenseUrl: entry.licenseUrl, transformation: '缩小尺寸并转为 WebP' } : {}) };
        console.log(`${entry.id}: ${result.width}×${result.height}, ${result.bytes} B`);
      } catch (error) { failures.push({ id: entry.id, error: error.message }); console.error(`${entry.id}: FAILED ${error.message.split('\n')[0]}`); }
    }
  }
  await Promise.all(Array.from({ length: 4 }, worker));
  await writeFile('src/data/images.json', JSON.stringify(Object.fromEntries(Object.entries(output).sort(([a], [b]) => a.localeCompare(b))), null, 2) + '\n');
  await writeFile('docs/image-fetch-report.json', JSON.stringify({ checked: new Date().toISOString(), count: Object.keys(output).length, failures }, null, 2) + '\n');
  console.log(`${Object.keys(output).length} images ready; ${failures.length} failed.`);
  if (failures.length) process.exitCode = 1;
} finally { await rm(directory, { recursive: true, force: true }); }
