/**
 * Upload Dusty Blue casual denim (no cargo pockets) + Shopify import CSV.
 * Color: Dusty Blue | Sizes: S, M, L, XL | Price: 650
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
  'c__Users_Sifat_AppData_Roaming_Cursor_User_workspaceStorage_de0f6ef3ef4bec4bed8cc38730654303_images_Female_Dusty_Blue_with_out_pocket-28857d53-3532-4514-ba08-8657559d7366.png',
  'c__Users_Sifat_AppData_Roaming_Cursor_User_workspaceStorage_de0f6ef3ef4bec4bed8cc38730654303_images_Female_Dusty_Blue_with_out_pocket1-c4fe2042-5cc9-4788-b081-9345c9c1a80a.png',
];

const HANDLE = 'akino-dusty-blue-casual-denim';
const TITLE = 'AKINO Dusty Blue Casual Denim';
const PRICE = '650.00';
const COLOR = 'Dusty Blue';
const SIZES = ['S', 'M', 'L', 'XL'];

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
  const body = `<p>${TITLE}</p><ul><li>Casual denim without cargo pockets</li><li>Soft wide-leg fit with drawstring waist</li><li>Color: Dusty Blue</li><li>Sizes: S, M, L, XL</li></ul>`;

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

  SIZES.forEach((size, i) => {
    const isFirst = i === 0;
    const sku = `akino-dusty-blue-denim-${size.toLowerCase()}`;
    rows.push(
      [
        HANDLE,
        isFirst ? TITLE : '',
        isFirst ? body : '',
        isFirst ? 'AKINO' : '',
        isFirst ? 'Casual Denim' : '',
        isFirst ? 'denim,casual,dusty-blue,streetwear,pants' : '',
        isFirst ? 'TRUE' : '',
        isFirst ? 'Color' : '',
        COLOR,
        isFirst ? 'Size' : '',
        size,
        sku,
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

  const out = join(__dirname, 'akino-dusty-blue-casual-denim-650.csv');
  writeFileSync(out, rows.join('\n') + '\n', 'utf8');
  console.log(`CSV written: ${out}`);
}

const urls = await uploadAll();
buildCsv(urls);
console.log('Done.');
