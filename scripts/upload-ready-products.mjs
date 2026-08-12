/**
 * Upload Ready-folder tees to Cloudinary + build Shopify import CSV,
 * and create products via Admin API when `shopify store auth` is available.
 *
 * Groups by first name. Each product gets:
 *   Color: Black - 220 GSM | Dark Ash - 180 GSM
 *   Print: DTF
 *
 * Usage:
 *   node scripts/upload-ready-products.mjs [--skip-cloudinary] [--csv-only]
 */
import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
dotenv.config({ path: join(root, '.env') });

const READY_DIR = 'C:\\Users\\Sifat\\Downloads\\Ready';
const STORE = 'a2q5pq-1x.myshopify.com';
const PRICE = '650.00';
const VENDOR = 'AKINO';
const PRODUCT_TYPE = 'Drop Shoulder Tee';
const skipCloudinary = process.argv.includes('--skip-cloudinary');
const csvOnly = process.argv.includes('--csv-only');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'hua42kke',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

const COLORS = ['Black - 220 GSM', 'Dark Ash - 180 GSM'];

const TITLE_MAP = {
  AOT: 'AKINO AOT Oversized Tee',
  chaos: 'AKINO Chaos Oversized Tee',
  'Chapter 4': 'AKINO Chapter 4 Oversized Tee',
  CRADLIFS: 'AKINO Cradlifs Oversized Tee',
  'Dhaka Cult': 'AKINO Dhaka Cult Oversized Tee',
  Dollar: 'AKINO Dollar Oversized Tee',
  'Fight Club': 'AKINO Fight Club Oversized Tee',
  follow: 'AKINO Follow Your Own Path Oversized Tee',
  'Game Over': 'AKINO Game Over Oversized Tee',
  'Getting Older': 'AKINO Getting Older Oversized Tee',
  Grafity: 'AKINO Grafity Oversized Tee',
  Justice: 'AKINO Justice Oversized Tee',
  Mentality2: 'AKINO Mentality II Oversized Tee',
  Mentatly: 'AKINO Mentality Oversized Tee',
  Mentelity: 'AKINO Mentality Classic Oversized Tee',
};

function groupKey(baseName) {
  if (/^Dollar\d+$/i.test(baseName)) return 'Dollar';
  if (/^Dhaka Cult/i.test(baseName)) return 'Dhaka Cult';
  if (/^fight club/i.test(baseName)) return 'Fight Club';
  if (/^Getting Older/i.test(baseName)) return 'Getting Older';
  if (/^Game Over/i.test(baseName)) return 'Game Over';
  if (/^chpter4/i.test(baseName)) return 'Chapter 4';
  if (/^Mentality2/i.test(baseName)) return 'Mentality2';
  if (/^Mentatly/i.test(baseName)) return 'Mentatly';
  if (/^Mentelity/i.test(baseName)) return 'Mentelity';
  if (/^Justice/i.test(baseName)) return 'Justice';
  const m = baseName.match(/^(.+?)\s+\d+$/);
  if (m) return m[1];
  return baseName.replace(/\s+\d+$/, '') || baseName;
}

function handleFor(group) {
  return `akino-${group}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function bodyHtml(title) {
  return `<p>${title}</p>
<ul>
<li>DTF print</li>
<li>Color options: Black — 220 GSM / Dark Ash — 180 GSM</li>
<li>Oversized drop-shoulder fit</li>
</ul>`;
}

function collectGroups() {
  if (!existsSync(READY_DIR)) throw new Error(`Missing folder: ${READY_DIR}`);
  const files = readdirSync(READY_DIR).filter((f) => /\.(png|jpe?g|webp)$/i.test(f));
  const groups = new Map();
  for (const file of files) {
    const base = basename(file, extname(file));
    const key = groupKey(base);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(join(READY_DIR, file));
  }
  for (const [k, list] of groups) {
    list.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    groups.set(k, list);
  }
  return groups;
}

async function uploadImage(localPath, publicId) {
  const result = await cloudinary.uploader.upload(localPath, {
    public_id: publicId,
    folder: 'akino/ready',
    overwrite: true,
    resource_type: 'image',
  });
  return result.secure_url;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function buildCsv(products) {
  const headers = [
    'Handle',
    'Title',
    'Body (HTML)',
    'Vendor',
    'Type',
    'Tags',
    'Published',
    'Option1 Name',
    'Option1 Value',
    'Variant SKU',
    'Variant Inventory Tracker',
    'Variant Inventory Qty',
    'Variant Inventory Policy',
    'Variant Fulfillment Service',
    'Variant Price',
    'Variant Requires Shipping',
    'Variant Taxable',
    'Image Src',
    'Image Position',
    'Image Alt Text',
    'Status',
  ];
  const rows = [headers.join(',')];

  for (const p of products) {
    COLORS.forEach((color, colorIdx) => {
      const isFirst = colorIdx === 0;
      const image = p.imageUrls[0] || '';
      rows.push(
        [
          p.handle,
          isFirst ? p.title : '',
          isFirst ? p.body : '',
          isFirst ? VENDOR : '',
          isFirst ? PRODUCT_TYPE : '',
          isFirst ? 'dtf,drop-shoulder,streetwear,ready' : '',
          isFirst ? 'TRUE' : '',
          isFirst ? 'Color' : '',
          color,
          `${p.handle}-${colorIdx + 1}`,
          'shopify',
          '10',
          'deny',
          'manual',
          PRICE,
          'TRUE',
          'TRUE',
          isFirst ? image : '',
          isFirst && image ? '1' : '',
          isFirst ? p.title : '',
          isFirst ? 'active' : '',
        ]
          .map(csvEscape)
          .join(',')
      );
    });

    // Extra gallery images
    p.imageUrls.slice(1).forEach((url, i) => {
      rows.push(
        [
          p.handle,
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          url,
          String(i + 2),
          p.title,
          '',
        ]
          .map(csvEscape)
          .join(',')
      );
    });
  }
  return rows.join('\n');
}

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
  if (variables) args.push(`--variables=${JSON.stringify(variables)}`);
  if (allowMutations) args.push('--allow-mutations');
  const out = execFileSync('npx', args, {
    encoding: 'utf8',
    maxBuffer: 30 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const start = out.indexOf('{');
  if (start < 0) throw new Error(out);
  return JSON.parse(out.slice(start));
}

function hasStoreAuth() {
  try {
    const out = execFileSync(
      'npx',
      ['--yes', '@shopify/cli', 'store', 'auth', 'list'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }
    );
    return out.includes(STORE) || out.includes('a2q5pq-1x');
  } catch {
    return false;
  }
}

async function createProductViaApi(product) {
  const mutation = `mutation productCreate($product: ProductCreateInput!, $media: [CreateMediaInput!]) {
    productCreate(product: $product, media: $media) {
      product { id handle title }
      userErrors { field message }
    }
  }`;

  const media = product.imageUrls.map((url) => ({
    originalSource: url,
    alt: product.title,
    mediaContentType: 'IMAGE',
  }));

  const variables = {
    product: {
      title: product.title,
      handle: product.handle,
      descriptionHtml: product.body,
      vendor: VENDOR,
      productType: PRODUCT_TYPE,
      status: 'ACTIVE',
      tags: ['dtf', 'drop-shoulder', 'streetwear', 'ready'],
      productOptions: [
        {
          name: 'Color',
          values: COLORS.map((name) => ({ name })),
        },
      ],
    },
    media,
  };

  const created = shopifyExecute(mutation, variables, { allowMutations: true });
  const errs = created?.data?.productCreate?.userErrors || [];
  if (errs.length) throw new Error(JSON.stringify(errs));
  const productId = created?.data?.productCreate?.product?.id;
  if (!productId) throw new Error(JSON.stringify(created));

  // Set variant prices via productVariantsBulkUpdate after query
  const q = `query ($id: ID!) {
    product(id: $id) {
      variants(first: 10) { nodes { id title } }
    }
  }`;
  const vdata = shopifyExecute(q, { id: productId });
  const variants = vdata?.data?.product?.variants?.nodes || [];
  if (variants.length) {
    const bulk = `mutation ($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants { id }
        userErrors { field message }
      }
    }`;
    shopifyExecute(
      bulk,
      {
        productId,
        variants: variants.map((v) => ({
          id: v.id,
          price: PRICE,
          inventoryPolicy: 'DENY',
        })),
      },
      { allowMutations: true }
    );
  }

  return created.data.productCreate.product;
}

const groups = collectGroups();
console.log(`Found ${groups.size} product groups in ${READY_DIR}`);

const products = [];
for (const [group, files] of groups) {
  const handle = handleFor(group);
  const title = TITLE_MAP[group] || `AKINO ${group} Oversized Tee`;
  console.log(`\n=== ${title} (${files.length} images) ===`);

  const imageUrls = [];
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const publicId = `${handle}-${i + 1}`;
    if (skipCloudinary) {
      console.log(`  skip upload ${basename(file)}`);
      continue;
    }
    process.stdout.write(`  upload ${basename(file)} ... `);
    try {
      const url = await uploadImage(file, publicId);
      imageUrls.push(url);
      console.log('OK');
    } catch (e) {
      console.log('FAIL', e.message || e);
    }
  }

  products.push({
    group,
    handle,
    title,
    body: bodyHtml(title),
    files,
    imageUrls,
  });
}

const outDir = join(root, 'scripts');
mkdirSync(outDir, { recursive: true });
const manifestPath = join(outDir, 'ready-products-manifest.json');
writeFileSync(manifestPath, JSON.stringify({ uploadedAt: new Date().toISOString(), products }, null, 2));
const csvPath = join(outDir, 'ready-products-import.csv');
writeFileSync(csvPath, buildCsv(products.filter((p) => p.imageUrls.length)));
console.log(`\nWrote ${manifestPath}`);
console.log(`Wrote ${csvPath}`);

if (csvOnly) {
  console.log('csv-only mode — import the CSV in Shopify Admin → Products → Import');
  process.exit(0);
}

if (!hasStoreAuth()) {
  console.log(`
No Shopify store auth yet.
1) Import CSV now:
   Admin → Products → Import → ${csvPath}
2) Or run auth, then re-run with --skip-cloudinary:
   npx @shopify/cli store auth --store=${STORE} --scopes=read_products,write_products,write_files
`);
  process.exit(0);
}

console.log('\nCreating products via Admin API...');
for (const p of products) {
  if (!p.imageUrls.length) {
    console.log(`SKIP ${p.handle} (no images)`);
    continue;
  }
  try {
    const res = await createProductViaApi(p);
    console.log(`CREATED ${res.handle} → ${res.id}`);
  } catch (e) {
    console.error(`FAIL ${p.handle}:`, e.message || e);
  }
}
