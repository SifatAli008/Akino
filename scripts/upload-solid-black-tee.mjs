/**
 * Upload Male Black Solid images to Cloudinary and build Shopify import CSV
 * with the same terry/ready tee matrix:
 *   Black - 220 GSM → M, XL
 *   Dark Ash - 180 GSM → M, L, XL
 * Price: 650
 */
import { writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
dotenv.config({ path: join(root, '.env') });

const ASSETS =
  'C:\\Users\\Sifat\\.cursor\\projects\\d-akino-website-theme-export-akino-store-horizon-12AUG2026-0857am\\assets';

const IMAGE_FILES = [
  'c__Users_Sifat_AppData_Roaming_Cursor_User_workspaceStorage_de0f6ef3ef4bec4bed8cc38730654303_images_Male_Black_Solid3-fd41f877-5c6b-43dd-8075-6a14cdb82688.png',
  'c__Users_Sifat_AppData_Roaming_Cursor_User_workspaceStorage_de0f6ef3ef4bec4bed8cc38730654303_images_Male_Black_Solid1-bd4bbd29-d9f0-4650-9231-83e38e31a39c.png',
  'c__Users_Sifat_AppData_Roaming_Cursor_User_workspaceStorage_de0f6ef3ef4bec4bed8cc38730654303_images_Male_Black_Solid2-3862fa15-b520-4320-b06f-a68bef42408b.png',
  'c__Users_Sifat_AppData_Roaming_Cursor_User_workspaceStorage_de0f6ef3ef4bec4bed8cc38730654303_images_Male_Black_Solid-10be689f-23e7-4747-900d-adee782fb648.png',
];

const HANDLE = 'akino-solid-black';
const TITLE = 'AKINO Solid Black Oversized Tee';
const PRICE = '650.00';

const VARIANT_MATRIX = [
  { color: 'Black - 220 GSM', size: 'M', sku: 'akino-solid-black-blk-m' },
  { color: 'Black - 220 GSM', size: 'XL', sku: 'akino-solid-black-blk-xl' },
  { color: 'Dark Ash - 180 GSM', size: 'M', sku: 'akino-solid-black-ash-m' },
  { color: 'Dark Ash - 180 GSM', size: 'L', sku: 'akino-solid-black-ash-l' },
  { color: 'Dark Ash - 180 GSM', size: 'XL', sku: 'akino-solid-black-ash-xl' },
];

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'hua42kke',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function esc(v) {
  const s = String(v ?? '');
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function uploadAll() {
  const urls = [];
  for (let i = 0; i < IMAGE_FILES.length; i++) {
    const path = join(ASSETS, IMAGE_FILES[i]);
    if (!existsSync(path)) throw new Error(`Missing image: ${path}`);
    const publicId = `akino/ready/${HANDLE}-${i + 1}`;
    console.log(`Uploading ${i + 1}/${IMAGE_FILES.length} → ${publicId}`);
    const res = await cloudinary.uploader.upload(path, {
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
    });
    urls.push(res.secure_url);
    console.log(`  ${res.secure_url}`);
  }
  return urls;
}

function buildCsv(imageUrls) {
  const body = `<p>${TITLE}</p><ul><li>Terry cotton</li><li>Color options: Black - 220 GSM / Dark Ash - 180 GSM</li><li>Sizes: Black (M, XL) / Dark Ash (M, L, XL)</li><li>Oversized drop-shoulder fit</li></ul>`;

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

  VARIANT_MATRIX.forEach((v, i) => {
    const isFirst = i === 0;
    rows.push(
      [
        HANDLE,
        isFirst ? TITLE : '',
        isFirst ? body : '',
        isFirst ? 'AKINO' : '',
        isFirst ? 'Drop Shoulder Tee' : '',
        isFirst ? 'terry,drop-shoulder,streetwear,solid' : '',
        isFirst ? 'TRUE' : '',
        isFirst ? 'Color' : '',
        v.color,
        isFirst ? 'Size' : '',
        v.size,
        v.sku,
        'shopify',
        '10',
        'deny',
        'manual',
        PRICE,
        'TRUE',
        'TRUE',
        isFirst ? imageUrls[0] : '',
        isFirst ? '1' : '',
        isFirst ? TITLE : '',
        isFirst ? 'active' : '',
      ]
        .map(esc)
        .join(',')
    );
  });

  for (let i = 1; i < imageUrls.length; i++) {
    rows.push(
      [
        HANDLE,
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
        imageUrls[i],
        String(i + 1),
        TITLE,
        '',
      ]
        .map(esc)
        .join(',')
    );
  }

  const out = join(__dirname, 'akino-solid-black-650.csv');
  writeFileSync(out, rows.join('\n') + '\n', 'utf8');
  console.log(`CSV written: ${out}`);
  return out;
}

const urls = await uploadAll();
buildCsv(urls);
console.log('Done.');
