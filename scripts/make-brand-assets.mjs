/**
 * 一次性脚本：把 public/logo.svg 合成 favicon 与分享图。
 *
 * 为什么要合成而不是直接指向 svg：
 * - logo.svg 图形是白色的，浏览器标签栏多为浅色，白图案直接当 favicon 看不见，
 *   必须垫一层深蓝底；
 * - og:image 在微信/微博等平台**不渲染 SVG**，只能用位图。
 *
 * 跑法：node scripts/make-brand-assets.mjs
 */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, '..', 'public');

/** 页头深蓝实底，与 CommunityLayout 的页头一致 */
const BRAND_BLUE = '#1D45A8';

const svg = await readFile(join(publicDir, 'logo.svg'));

/**
 * logo.svg 的 viewBox 是 351.46 × 171.24，上半部是图形、下半部是中文标字。
 * 方形图标只取上半部的图形，所以按比例裁 —— 硬编码像素会随 viewBox 改动而错位。
 */
const VIEWBOX = { width: 351.46, height: 171.24 };
const MARK_RATIO = 117 / VIEWBOX.height;

/** 先把整幅 SVG 栅格化成位图，后续 extract 才有个整数尺寸的画布可切 */
async function rasterize(targetWidth) {
  return sharp(svg, { density: 600 })
    .resize(targetWidth, null, { fit: 'inside' })
    .png()
    .toBuffer();
}

/** 取图形部分（丢掉中文标字） */
async function markBuffer(targetWidth) {
  const full = await rasterize(targetWidth);
  const meta = await sharp(full).metadata();
  return sharp(full)
    .extract({ left: 0, top: 0, width: meta.width, height: Math.round(meta.height * MARK_RATIO) })
    .png()
    .toBuffer();
}

async function makeIcon(size, outName) {
  const mark = await markBuffer(size * 4);
  const fitted = await sharp(mark)
    .resize(Math.round(size * 0.82), Math.round(size * 0.82), {
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  const meta = await sharp(fitted).metadata();

  await sharp({
    create: { width: size, height: size, channels: 4, background: BRAND_BLUE },
  })
    .composite([
      {
        input: fitted,
        left: Math.round((size - meta.width) / 2),
        top: Math.round((size - meta.height) / 2),
      },
    ])
    .png()
    .toFile(join(publicDir, outName));

  console.log(`wrote ${outName} (${size}x${size}, mark ${meta.width}x${meta.height})`);
}

await makeIcon(512, 'favicon-512.png');
await makeIcon(180, 'apple-touch-icon.png');

/** 分享图：深蓝底 + 完整 logo（含标字），1200×630 是各平台通用比例 */
const full = await rasterize(900);
const fullMeta = await sharp(full).metadata();

await sharp({
  create: { width: 1200, height: 630, channels: 4, background: BRAND_BLUE },
})
  .composite([
    {
      input: full,
      left: Math.round((1200 - fullMeta.width) / 2),
      top: Math.round((630 - fullMeta.height) / 2),
    },
  ])
  .png()
  .toFile(join(publicDir, 'og-image.png'));

console.log(`wrote og-image.png (1200x630, logo ${fullMeta.width}x${fullMeta.height})`);
