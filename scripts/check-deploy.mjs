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
const pagesConfig = await readFile('wrangler.toml', 'utf8');
assert.equal(config.d1_databases[0].database_id, pagesConfig.match(/^database_id\s*=\s*"([^"]+)"/m)?.[1]);
assert.equal(config.kv_namespaces[0].id, pagesConfig.match(/^id\s*=\s*"([^"]+)"/m)?.[1]);
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

await access('dist/pages/_worker.js');
await access('dist/pages/_headers');
const routes = JSON.parse(await readFile('dist/pages/_routes.json', 'utf8'));
assert.ok(routes.exclude.includes('/images/*'));
for (const image of Object.values(images)) {
  if (image.src.startsWith('/')) assert.equal((await stat(`dist/pages${image.src}`)).size, image.bytes);
}
for (const privatePath of ['server/entry.mjs', 'client/', '.dev.vars', 'wrangler.toml', 'wrangler.worker.toml']) {
  assert.equal(await access(`dist/pages/${privatePath}`).then(() => true, () => false), false, `Private file in Pages: ${privatePath}`);
}
console.log('Pages artifact verified: image CDN routes and private-file isolation.');
