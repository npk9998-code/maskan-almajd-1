// تصغير الصور وإضافة العلامة المائية داخل المتصفح قبل الرفع
const FULL_WIDTH = 1280;
const THUMB_WIDTH = 480;
const MAX_FULL_BYTES = 700 * 1024;

async function loadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch {
      // نكمل بالطريقة الثانية
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fontFamily() {
  return getComputedStyle(document.body).fontFamily || 'sans-serif';
}

function drawWatermark(ctx, w, h, text) {
  const family = fontFamily();
  ctx.save();
  ctx.direction = 'rtl';
  ctx.textBaseline = 'middle';

  // علامة خفيفة في الوسط
  const big = Math.round(w * 0.085);
  ctx.font = `700 ${big}px ${family}`;
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.shadowColor = 'rgba(0,0,0,0.25)';
  ctx.shadowBlur = Math.round(big * 0.15);
  ctx.fillText(text, w / 2, h / 2);

  // علامة واضحة في الزاوية
  ctx.shadowColor = 'transparent';
  const size = Math.max(12, Math.round(w * 0.028));
  ctx.font = `600 ${size}px ${family}`;
  const padX = size * 0.8;
  const boxW = ctx.measureText(text).width + padX * 2;
  const boxH = size * 1.9;
  const margin = Math.round(w * 0.025);
  const x = margin;
  const y = h - margin - boxH;
  ctx.fillStyle = 'rgba(40,40,40,0.6)';
  ctx.beginPath();
  if (ctx.roundRect) ctx.roundRect(x, y, boxW, boxH, size * 0.4);
  else ctx.rect(x, y, boxW, boxH);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(text, x + boxW / 2, y + boxH / 2);
  ctx.restore();
}

function toBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function encode(canvas, quality) {
  // WebP إذا يدعمه المتصفح، وإلا JPEG (مثل Safari)
  const webp = await toBlob(canvas, 'image/webp', quality);
  if (webp && webp.type === 'image/webp') return webp;
  return toBlob(canvas, 'image/jpeg', quality + 0.05);
}

async function render(source, targetWidth, watermark) {
  const scale = Math.min(1, targetWidth / source.width);
  const w = Math.round(source.width * scale);
  const h = Math.round(source.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, w, h);
  if (watermark) drawWatermark(ctx, w, h, watermark);
  return canvas;
}

export async function processImage(file, watermark) {
  if (!file.type.startsWith('image/')) throw new Error('الملف مو صورة');
  const source = await loadImage(file);

  const fullCanvas = await render(source, FULL_WIDTH, watermark);
  let full = await encode(fullCanvas, 0.72);
  if (full.size > MAX_FULL_BYTES) full = await encode(fullCanvas, 0.55);

  const thumbCanvas = await render(fullCanvas, THUMB_WIDTH, null);
  const thumb = await encode(thumbCanvas, 0.7);

  if (typeof source.close === 'function') source.close();
  return { full, thumb, previewUrl: URL.createObjectURL(thumb) };
}
