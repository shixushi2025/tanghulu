import { readFile, stat, access } from 'node:fs/promises';
import assert from 'node:assert/strict';
const config = await readFile('wrangler.toml', 'utf8');
assert.match(config, /main = "worker\/index.ts"/);
assert.match(config, /directory = "\.\/dist"/);
assert.match(config, /not_found_handling = "404-page"/);
assert.doesNotMatch(config, /pages_build_output_dir/);
assert.match(config, /binding = "TANGHULU_DB"/);
assert.match(config, /binding = "TANGHULU_VIEWS"/);
assert.match(await readFile('astro.config.mjs', 'utf8'), /output: 'static'/);
for (const path of ['index.html', 'item/index.html', 'admin/edit/index.html', '404.html', '_headers']) await access(`dist/${path}`);
const images = JSON.parse(await readFile('src/data/images.json', 'utf8'));
for (const image of Object.values(images)) {
  if (image.src.startsWith('/')) assert.equal((await stat(`dist${image.src}`)).size, image.bytes, `Missing or stale image: ${image.src}`);
}
for (const privatePath of ['_worker.js', 'worker/', 'server/', 'pages/', '.dev.vars', 'wrangler.toml', 'migrations/', 'scripts/', 'src/']) {
  assert.equal(await access(`dist/${privatePath}`).then(() => true, () => false), false, `Private file published: ${privatePath}`);
}
console.log(`Verified static frontend + independent Worker; ${Object.keys(images).length} image records; no backend files in assets.`);
