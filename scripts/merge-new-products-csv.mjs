/**
 * Merge new product CSVs into one Shopify import file.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const files = [
  'akino-solid-black-650.csv',
  'akino-dusty-formal-pants-650.csv',
  'akino-utility-cargos-650.csv',
  'akino-dusty-blue-casual-denim-650.csv',
  'akino-blue-denim-with-pocket-650.csv',
];

const masterHeaders = [
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
  'Variant Image',
  'Status',
];

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.length > 1 || row[0] !== '') rows.push(row);
      row = [];
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function esc(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

const out = [masterHeaders.join(',')];
let products = 0;

for (const file of files) {
  const raw = readFileSync(join(__dirname, file), 'utf8').replace(/^\uFEFF/, '');
  const rows = parseCsv(raw);
  if (!rows.length) continue;
  const headers = rows[0].map((h) => h.trim());
  const idx = Object.fromEntries(headers.map((h, i) => [h, i]));
  let firstHandle = null;
  for (let r = 1; r < rows.length; r++) {
    const src = rows[r];
    const get = (name) => {
      const i = idx[name];
      return i === undefined ? '' : (src[i] ?? '');
    };
    const handle = get('Handle');
    if (handle && handle !== firstHandle) {
      if (firstHandle === null) products++;
      firstHandle = handle;
    }
    out.push(masterHeaders.map((h) => esc(get(h))).join(','));
  }
  console.log(`${file}: ${rows.length - 1} rows`);
}

const outPath = join(__dirname, 'akino-new-products-import.csv');
writeFileSync(outPath, out.join('\n') + '\n', 'utf8');
console.log(`Wrote ${outPath}`);
console.log(`Products: ${products} | Data rows: ${out.length - 1}`);
