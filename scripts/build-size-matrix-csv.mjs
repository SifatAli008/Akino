/**
 * Rebuild Shopify import CSV with Color + Size matrix:
 *   Black - 220 GSM → M, XL
 *   Dark Ash - 180 GSM → M, L, XL
 * Price: 650
 */
import { readFileSync, writeFileSync } from 'node:fs';

const manifest = JSON.parse(
  readFileSync(new URL('./ready-products-manifest.json', import.meta.url), 'utf8')
);
const products = manifest.products;
const PRICE = '650.00';

const VARIANT_MATRIX = [
  { color: 'Black - 220 GSM', size: 'M' },
  { color: 'Black - 220 GSM', size: 'XL' },
  { color: 'Dark Ash - 180 GSM', size: 'M' },
  { color: 'Dark Ash - 180 GSM', size: 'L' },
  { color: 'Dark Ash - 180 GSM', size: 'XL' },
];

function esc(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

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
  'Option2 Name',
  'Option2 Value',
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
  const body = `<p>${p.title}</p><ul><li>DTF print</li><li>Color options: Black - 220 GSM / Dark Ash - 180 GSM</li><li>Sizes: Black (M, XL) / Dark Ash (M, L, XL)</li><li>Oversized drop-shoulder fit</li></ul>`;

  VARIANT_MATRIX.forEach((variant, i) => {
    const first = i === 0;
    const sku = `${p.handle}-${variant.color.includes('Black') ? 'blk' : 'ash'}-${variant.size}`.toLowerCase();
    rows.push(
      [
        p.handle,
        first ? p.title : '',
        first ? body : '',
        first ? 'AKINO' : '',
        first ? 'Drop Shoulder Tee' : '',
        first ? 'dtf,drop-shoulder,streetwear,ready' : '',
        first ? 'TRUE' : '',
        first ? 'Color' : '',
        variant.color,
        first ? 'Size' : '',
        variant.size,
        sku,
        'shopify',
        '10',
        'deny',
        'manual',
        PRICE,
        'TRUE',
        'TRUE',
        first && p.imageUrls[0] ? p.imageUrls[0] : '',
        first && p.imageUrls[0] ? '1' : '',
        first ? p.title : '',
        first ? 'active' : '',
      ]
        .map(esc)
        .join(',')
    );
  });

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
        '',
        '',
        url,
        String(i + 2),
        p.title,
        '',
      ]
        .map(esc)
        .join(',')
    );
  });
}

const out = new URL('./akino-tees-color-size-650.csv', import.meta.url);
writeFileSync(out, rows.join('\n'), 'utf8');
console.log(`Wrote ${out.pathname}`);
console.log(`Products: ${products.length} | Variants each: ${VARIANT_MATRIX.length}`);
try {
  writeFileSync(new URL('./ready-products-sizes-650.csv', import.meta.url), rows.join('\n'), 'utf8');
} catch {
  console.log('ready-products-sizes-650.csv locked; use akino-tees-color-size-650.csv');
}
