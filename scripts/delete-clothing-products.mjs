/**
 * Delete clothing products; keep crochet / keychain.
 * Requires: shopify store auth --store a2q5pq-1x.myshopify.com --scopes read_products,write_products
 *
 * Usage: node scripts/delete-clothing-products.mjs [--dry-run]
 */
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const STORE = 'a2q5pq-1x.myshopify.com';
const dryRun = process.argv.includes('--dry-run');
const root = dirname(fileURLToPath(import.meta.url));

function shopifyExecute(query, variables, { allowMutations = false } = {}) {
  const args = [
    '--yes',
    '@shopify/cli',
    'store',
    'execute',
    `--store=${STORE}`,
    '--json',
    `--query=${query}`,
  ];
  if (variables) {
    args.push(`--variables=${JSON.stringify(variables)}`);
  }
  if (allowMutations) args.push('--allow-mutations');

  const out = execFileSync('npx', args, {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  // CLI may print npm warnings before JSON
  const start = out.indexOf('{');
  if (start < 0) throw new Error(`No JSON from shopify execute:\n${out}`);
  return JSON.parse(out.slice(start));
}

function isKeepProduct(p) {
  const hay = `${p.title} ${p.handle} ${p.productType || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
  return (
    hay.includes('crochet') ||
    hay.includes('keychain') ||
    hay.includes('key chain') ||
    hay.includes('plush')
  );
}

async function fetchAllProducts() {
  const products = [];
  let cursor = null;
  let hasNext = true;
  while (hasNext) {
    const query = `query ($cursor: String) {
      products(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { id title handle productType tags status }
      }
    }`;
    const data = shopifyExecute(query, { cursor });
    const conn = data?.data?.products;
    if (!conn) throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    products.push(...conn.nodes);
    hasNext = conn.pageInfo.hasNextPage;
    cursor = conn.pageInfo.endCursor;
  }
  return products;
}

function deleteProduct(id) {
  const mutation = `mutation ($id: ID!) {
    productDelete(input: { id: $id }) {
      deletedProductId
      userErrors { field message }
    }
  }`;
  return shopifyExecute(mutation, { id }, { allowMutations: true });
}

const all = await fetchAllProducts();
const keep = all.filter(isKeepProduct);
const remove = all.filter((p) => !isKeepProduct(p));

const plan = {
  store: STORE,
  dryRun,
  keepCount: keep.length,
  removeCount: remove.length,
  keep: keep.map((p) => ({ id: p.id, title: p.title, handle: p.handle })),
  remove: remove.map((p) => ({ id: p.id, title: p.title, handle: p.handle })),
};

writeFileSync(join(root, 'delete-clothing-plan.json'), JSON.stringify(plan, null, 2));
console.log(`Keep ${keep.length} | Delete ${remove.length} (dryRun=${dryRun})`);
keep.forEach((p) => console.log(`  KEEP  ${p.handle}`));

if (dryRun) {
  remove.slice(0, 10).forEach((p) => console.log(`  DEL   ${p.handle}`));
  if (remove.length > 10) console.log(`  ... +${remove.length - 10} more`);
  process.exit(0);
}

let deleted = 0;
let failed = 0;
for (const p of remove) {
  try {
    const res = deleteProduct(p.id);
    const errs = res?.data?.productDelete?.userErrors || [];
    if (errs.length) {
      failed += 1;
      console.error(`FAIL ${p.handle}`, errs);
    } else {
      deleted += 1;
      console.log(`DELETED ${p.handle}`);
    }
  } catch (e) {
    failed += 1;
    console.error(`FAIL ${p.handle}`, e.message || e);
  }
}

console.log(`\nDone. deleted=${deleted} failed=${failed} kept=${keep.length}`);
console.log('Collections/categories were not modified.');
