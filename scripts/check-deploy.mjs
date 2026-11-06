import { readFile, stat, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import assert from 'node:assert/strict';
const images = JSON.parse(await readFile('src/data/images.json', 'utf8'));
const configPath = resolve('dist/server/wrangler.json');
const config = JSON.parse(await readFile(configPath, 'utf8'));
await access(resolve(dirname(configPath), config.main));
assert.equal(resolve(dirname(configPath), config.assets.directory), resolve('dist/client'));
assert.equal(config.assets.binding, 'ASSETS');
assert.deepEqual(config.kv_namespaces.map(namespace => namespace.binding), ['TANGHULU_VIEWS']);
assert.equal(config.d1_databases[0].binding, 'TANGHULU_DB');
await access('dist/client/_headers');
for (const image of Object.values(images)) {
  if (!image.src.startsWith('/')) continue;
  const file = await stat(`dist/client${image.src}`);
  assert.equal(file.size, image.bytes, `Missing or stale image: ${image.src}`);
}
for (const privatePath of ['_worker.js', 'worker/index.js', 'server/entry.mjs', '.dev.vars', 'wrangler.toml']) {
  assert.equal(await access(`dist/client/${privatePath}`).then(() => true, () => false), false, `Private file published: ${privatePath}`);
}
console.log(`Deployment verified: Worker separated from public assets; ${Object.keys(images).length} image records checked.`);
