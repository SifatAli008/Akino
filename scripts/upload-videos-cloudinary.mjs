import { createWriteStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

dotenv.config({ path: join(root, '.env') });

const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'hua42kke';
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!apiKey || !apiSecret || apiSecret.includes('your_api_secret')) {
  console.error(`
Missing Cloudinary credentials.

1. Copy .env.example → .env
2. Paste your API secret from Cloudinary Dashboard → Settings → API Keys
3. Run: npm run upload:videos
`);
  process.exit(1);
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
  secure: true,
});

/** Local asset → Cloudinary public_id (no extension) */
const VIDEOS = [
  { file: 'akino-hero.mp4', publicId: 'akino/hero' },
  { file: 'akino-hero-2.mp4', publicId: 'akino/hero-2' },
  { file: 'akino-hero-3.mp4', publicId: 'akino/hero-3' },
  { file: 'akino-hero-4.mp4', publicId: 'akino/hero-4' },
];

function deliveryUrl(publicId, { width = 1920 } = {}) {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    secure: true,
    transformation: [
      {
        quality: 'auto',
        fetch_format: 'mp4',
        video_codec: 'auto',
        width,
        crop: 'limit',
      },
    ],
  });
}

function posterUrl(publicId) {
  return cloudinary.url(publicId, {
    resource_type: 'video',
    secure: true,
    format: 'jpg',
    transformation: [
      { start_offset: '0' },
      { quality: 'auto', fetch_format: 'auto', width: 1600, crop: 'limit' },
    ],
  });
}

async function uploadOne({ file, publicId }) {
  const path = join(root, 'assets', file);
  if (!existsSync(path)) {
    throw new Error(`Missing file: ${path}`);
  }

  console.log(`Uploading ${file} → ${publicId} ...`);
  const result = await cloudinary.uploader.upload(path, {
    resource_type: 'video',
    public_id: publicId,
    overwrite: true,
    invalidate: true,
    eager: [
      {
        quality: 'auto',
        fetch_format: 'mp4',
        video_codec: 'auto',
        width: 1920,
        crop: 'limit',
      },
      {
        quality: 'auto',
        fetch_format: 'mp4',
        video_codec: 'auto',
        width: 960,
        crop: 'limit',
      },
    ],
    eager_async: true,
  });

  return {
    file,
    publicId,
    bytes: result.bytes,
    duration: result.duration,
    url: deliveryUrl(publicId, { width: 1920 }),
    urlMobile: deliveryUrl(publicId, { width: 960 }),
    poster: posterUrl(publicId),
    secure_url: result.secure_url,
  };
}

const manifest = [];
for (const video of VIDEOS) {
  try {
    const row = await uploadOne(video);
    manifest.push(row);
    console.log(`  OK  ${row.url}`);
  } catch (err) {
    console.error(`  FAIL ${video.file}:`, err?.message || err);
    process.exitCode = 1;
  }
}

const outPath = join(root, 'scripts', 'cloudinary-videos.json');
writeFileSync(outPath, JSON.stringify({ cloudName, uploadedAt: new Date().toISOString(), videos: manifest }, null, 2));
console.log(`\nWrote ${outPath}`);
console.log('\nTheme uses these public IDs when Cloudinary videos are enabled in Theme settings.');
