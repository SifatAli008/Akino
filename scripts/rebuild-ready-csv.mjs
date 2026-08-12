import { readFileSync, writeFileSync } from 'node:fs';

const manifest = JSON.parse(
  readFileSync(new URL('./ready-products-manifest.json', import.meta.url), 'utf8')
);
const products = manifest.products;
const COLORS = ['Black - 220 GSM', 'Dark Ash - 180 GSM'];
const PRICE = '650.00';

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
  const body = `<p>${p.title}</p><ul><li>DTF print</li><li>Color options: Black - 220 GSM / Dark Ash - 180 GSM</li><li>Oversized drop-shoulder fit</li></ul>`;
  COLORS.forEach((color, i) => {
    const first = i === 0;
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
        color,
        `${p.handle}-${i + 1}`,
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

const out = new URL('./ready-products-import-650.csv', import.meta.url);
writeFileSync(out, rows.join('\n'), 'utf8');
console.log(`Wrote ${out.pathname} products=${products.length} dataRows=${rows.length - 1}`);

try {
  writeFileSync(new URL('./ready-products-import.csv', import.meta.url), rows.join('\n'), 'utf8');
  console.log('Also updated ready-products-import.csv');
} catch (e) {
  console.log('Could not overwrite ready-products-import.csv (file locked). Use ready-products-import-650.csv');
}
