/**
 * Upload utility cargos + build Shopify import CSV.
 * Colors: Black, Blue | Sizes: S, M, L, XL | Price: 650
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

// Gallery order: black front, black multi-angle, black detail, blue front
const IMAGE_FILES = [
  {
    file: 'c__Users_Sifat_AppData_Roaming_Cursor_User_workspaceStorage_de0f6ef3ef4bec4bed8cc38730654303_images_Female_Cargo_lodaded_with_pocket-1982acc2-ac28-4486-92ac-a577418249a9.png',
    color: 'Black',
  },
  {
    file: 'c__Users_Sifat_AppData_Roaming_Cursor_User_workspaceStorage_de0f6ef3ef4bec4bed8cc38730654303_images_Female_Cargo_lodaded__with_pocket2-4877d0e0-ab7d-468d-bfca-e45eee6842c3.png',
    color: 'Black',
  },
  {
    file: 'c__Users_Sifat_AppData_Roaming_Cursor_User_workspaceStorage_de0f6ef3ef4bec4bed8cc38730654303_images_Female_Cargo_lodaded__with_pocket1-f4618138-6ef5-4ed8-a70e-8e0badc2b65e.png',
    color: 'Black',
  },
  {
    file: 'c__Users_Sifat_AppData_Roaming_Cursor_User_workspaceStorage_de0f6ef3ef4bec4bed8cc38730654303_images_Female_Cargo_lodaded_with_pocket3-6bbe4501-b7bc-4aa2-8fcf-1d76d41c8498.png',
    color: 'Blue',
  },
];

const HANDLE = 'akino-utility-cargos';
const TITLE = 'AKINO Utility Cargos';
const PRICE = '650.00';
const COLORS = ['Black', 'Blue'];
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
  const uploaded = [];
  for (let i = 0; i < IMAGE_FILES.length; i++) {
    const { file, color } = IMAGE_FILES[i];
    const path = join(ASSETS, file);
    if (!existsSync(path)) throw new Error(`Missing image: ${path}`);
    const publicId = `akino/ready/${HANDLE}-${i + 1}`;
    console.log(`Uploading ${i + 1}/${IMAGE_FILES.length} (${color}) → ${publicId}`);
    const res = await cloudinary.uploader.upload(path, {
      public_id: publicId,
      overwrite: true,
      resource_type: 'image',
    });
    uploaded.push({ url: res.secure_url, color });
    console.log(`  ${res.secure_url}`);
  }
  return uploaded;
}

function buildCsv(images) {
  const body = `<p>${TITLE}</p><p>Sleek, black, and loaded with pocket space. Our new utility cargos have arrived.</p><ul><li>Utility cargo style with drawstring waist</li><li>Loaded with pocket space</li><li>Colors: Black / Blue</li><li>Sizes: S, M, L, XL</li><li>Relaxed wide-leg fit</li></ul>`;

  const blackImg = images.find((i) => i.color === 'Black')?.url || images[0].url;
  const blueImg = images.find((i) => i.color === 'Blue')?.url || images[images.length - 1].url;

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
    'Variant Image',
    'Status',
  ];

  const rows = [headers.join(',')];
  let first = true;

  for (const color of COLORS) {
    for (const size of SIZES) {
      const sku = `akino-cargos-${color.toLowerCase()}-${size.toLowerCase()}`;
      const variantImage = color === 'Black' ? blackImg : blueImg;
      rows.push(
        [
          HANDLE,
          first ? TITLE : '',
          first ? body : '',
          first ? 'AKINO' : '',
          first ? 'Cargo Pants' : '',
          first ? 'cargo,utility,streetwear,pants' : '',
          first ? 'TRUE' : '',
          first ? 'Color' : '',
          color,
          first ? 'Size' : '',
          size,
          sku,
          'shopify',
          '10',
          'deny',
          'manual',
          PRICE,
          'TRUE',
          'TRUE',
          first ? images[0].url : '',
          first ? '1' : '',
          first ? TITLE : '',
          variantImage,
          first ? 'active' : '',
        ]
          .map(esc)
          .join(',')
      );
      first = false;
    }
  }

  for (let i = 1; i < images.length; i++) {
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
        images[i].url,
        String(i + 1),
        TITLE,
        '',
        '',
      ]
        .map(esc)
        .join(',')
    );
  }

  const out = join(__dirname, 'akino-utility-cargos-650.csv');
  writeFileSync(out, rows.join('\n') + '\n', 'utf8');
  console.log(`CSV written: ${out}`);
}

const images = await uploadAll();
buildCsv(images);
console.log('Done.');
