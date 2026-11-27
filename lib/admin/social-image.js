'use client';

// صور جاهزة للسناب والإنستقرام وتيك توك — تتسوى في جهازك، ما تاخذ مساحة من الموقع
import { formatNumber, offerHeading, offerTitle, priceInfo } from '@/lib/format';
import { SITE } from '@/lib/site';

let waDisplay = '';
const getWhatsAppDisplay = () => waDisplay;
// 9665xxxxxxxx ← 05xxxxxxxx
const localPhone = (n) => (n ? String(n).replace(/^966/, '0') : '');

const GREEN = '#0f5c4d';
const GREEN_SOFT = '#cfe3dc';
const GOLD = '#c9a227';
const RED = '#c0392b';
const QR_LIB = 'https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js';

let qrPromise = null;
function loadQr() {
  if (window.qrcode) return Promise.resolve(window.qrcode);
  if (!qrPromise) {
    qrPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = QR_LIB;
      s.async = true;
      s.onload = () => resolve(window.qrcode);
      s.onerror = () => {
        qrPromise = null;
        reject(new Error('qr'));
      };
      document.head.appendChild(s);
    });
  }
  return qrPromise;
}

function loadImage(src) {
  return new Promise((resolve) => {
    if (!src) return resolve(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

const fontFamily = () => getComputedStyle(document.body).fontFamily || 'sans-serif';

function canvasOf(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.direction = 'rtl';
  ctx.textBaseline = 'alphabetic';
  return [c, ctx];
}

function font(ctx, size, weight = 700) {
  ctx.font = `${weight} ${size}px ${fontFamily()}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// صورة تغطي المربع بدون ما تنمط
function drawCover(ctx, img, x, y, w, h, radius = 0) {
  ctx.save();
  if (radius) {
    roundRect(ctx, x, y, w, h, radius);
    ctx.clip();
  }
  if (img) {
    const scale = Math.max(w / img.width, h / img.height);
    const sw = w / scale;
    const sh = h / scale;
    ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
  } else {
    ctx.fillStyle = '#1d6e5e';
    ctx.fillRect(x, y, w, h);
    font(ctx, Math.round(w / 12));
    ctx.fillStyle = GREEN_SOFT;
    ctx.textAlign = 'center';
    ctx.fillText(SITE.shortName, x + w / 2, y + h / 2);
  }
  ctx.restore();
}

function badge(ctx, text, rightX, y, bg, fg = '#fff', size = 34) {
  font(ctx, size);
  const w = ctx.measureText(text).width + size * 1.2;
  const h = size * 1.7;
  roundRect(ctx, rightX - w, y, w, h, h / 2);
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.fillText(text, rightX - w / 2, y + h * 0.68);
  return h;
}

function drawQr(ctx, qrcode, url, x, y, size) {
  const qr = qrcode(0, 'M');
  qr.addData(url);
  qr.make();
  const n = qr.getModuleCount();
  const pad = size * 0.06;
  ctx.fillStyle = '#fff';
  roundRect(ctx, x, y, size, size, size * 0.08);
  ctx.fill();
  const cell = (size - pad * 2) / n;
  ctx.fillStyle = GREEN;
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (qr.isDark(r, c)) ctx.fillRect(x + pad + c * cell, y + pad + r * cell, Math.ceil(cell), Math.ceil(cell));
    }
  }
}

function specsOf(offer) {
  const list = [];
  if (offer.area) list.push(`${formatNumber(offer.area)} م²`);
  if (offer.type !== 'land' && offer.rooms != null) list.push(`${offer.rooms} غرف`);
  if (offer.facade) list.push(offer.facade);
  else if (offer.streetWidth) list.push(`شارع ${offer.streetWidth} م`);
  return list.slice(0, 3);
}

function header(ctx, w, y) {
  font(ctx, 40);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'right';
  ctx.fillText(SITE.name, w - 64, y);
}

function priceBlock(ctx, offer, rightX, y, big = 76) {
  const p = priceInfo(offer);
  if (offer.priceDropped && offer.previousPrice && !p.hidden) {
    font(ctx, Math.round(big * 0.45), 500);
    ctx.fillStyle = GREEN_SOFT;
    ctx.textAlign = 'right';
    const old = `${formatNumber(offer.previousPrice)} ريال`;
    ctx.fillText(old, rightX, y - big - 8);
    const ow = ctx.measureText(old).width;
    ctx.fillRect(rightX - ow, y - big - 8 - big * 0.16, ow, 3);
  }
  font(ctx, p.hidden ? Math.round(big * 0.7) : big);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'right';
  ctx.fillText(p.text, rightX, y);
}

function footer(ctx, qrcode, offer, url, w, h, bandH) {
  const y = h - bandH;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, y, w, bandH);
  const qrSize = bandH - 48;
  drawQr(ctx, qrcode, url, 48, y + 24, qrSize);
  ctx.textAlign = 'right';
  ctx.fillStyle = GREEN;
  font(ctx, 42);
  ctx.fillText('صوّر الكود للتفاصيل', w - 64, y + bandH * 0.36);
  font(ctx, 34, 500);
  const wa = getWhatsAppDisplay();
  if (wa) ctx.fillText(`واتساب ${wa}`, w - 64, y + bandH * 0.6);
  ctx.fillText(`رقم العرض ${offer.id}`, w - 64, y + bandH * 0.82);
}

function badgesFor(offer) {
  const out = [];
  if (offer.status === 'sold') return [['تم البيع', '#1c2130']];
  if (offer.featured) out.push(['✨ فرصة', GOLD]);
  if (offer.priceDropped) out.push(['🔻 نزل السعر', RED]);
  return out;
}

const toBlob = (canvas) => new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.9));

// ===== ستوري (١٠٨٠×١٩٢٠) =====
async function story(offer, url, img, qrcode) {
  const W = 1080;
  const H = 1920;
  const [c, ctx] = canvasOf(W, H);
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);
  header(ctx, W, 110);
  drawCover(ctx, img, 48, 160, W - 96, 1000, 36);
  let by = 196;
  for (const [t, bg] of badgesFor(offer)) by += badge(ctx, t, W - 84, by, bg) + 14;
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fff';
  font(ctx, 72);
  ctx.fillText(offerTitle(offer), W - 64, 1270);
  font(ctx, 44, 500);
  ctx.fillStyle = GREEN_SOFT;
  ctx.fillText(`${offerHeading(offer)} · ${offer.city}`, W - 64, 1340);
  font(ctx, 38, 500);
  ctx.fillText(specsOf(offer).join('   ·   '), W - 64, 1410);
  priceBlock(ctx, offer, W - 64, 1560, 84);
  footer(ctx, qrcode, offer, url, W, H, 300);
  return toBlob(c);
}

// ===== بوست مربع (١٠٨٠×١٠٨٠) =====
async function post(offer, url, img, qrcode) {
  const W = 1080;
  const H = 1080;
  const [c, ctx] = canvasOf(W, H);
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);
  drawCover(ctx, img, 0, 0, W, 760);
  let by = 36;
  for (const [t, bg] of badgesFor(offer)) by += badge(ctx, t, W - 36, by, bg) + 12;
  // اسم المكتب على الصورة
  font(ctx, 32);
  const name = SITE.name;
  const nw = ctx.measureText(name).width + 40;
  roundRect(ctx, W - 36 - nw, 690, nw, 52, 26);
  ctx.fillStyle = 'rgba(15,92,77,0.92)';
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText(name, W - 36 - nw / 2, 726);

  ctx.textAlign = 'right';
  font(ctx, 54);
  ctx.fillStyle = '#fff';
  ctx.fillText(`${offerTitle(offer)} · ${offerHeading(offer)}`, W - 48, 840);
  font(ctx, 34, 500);
  ctx.fillStyle = GREEN_SOFT;
  ctx.fillText([offer.city, ...specsOf(offer)].join(' · '), W - 48, 896);
  priceBlock(ctx, offer, W - 48, 1010, 64);
  drawQr(ctx, qrcode, url, 40, 800, 230);
  return toBlob(c);
}

// ===== مجموعة صور طولية (تيك توك وكاروسيل إنستقرام) =====
async function carousel(offer, url, images, qrcode) {
  const W = 1080;
  const H = 1920;
  const blobs = [await story(offer, url, images[0], qrcode)];
  for (const img of images.slice(1, 9)) {
    const [c, ctx] = canvasOf(W, H);
    drawCover(ctx, img, 0, 0, W, H);
    const g = ctx.createLinearGradient(0, H - 420, 0, H);
    g.addColorStop(0, 'rgba(15,92,77,0)');
    g.addColorStop(1, 'rgba(15,92,77,0.95)');
    ctx.fillStyle = g;
    ctx.fillRect(0, H - 420, W, 420);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#fff';
    font(ctx, 56);
    ctx.fillText(`${offerHeading(offer)} · ${offer.city}`, W - 64, H - 170);
    font(ctx, 38, 500);
    ctx.fillText(specsOf(offer).join('   ·   '), W - 64, H - 100);
    font(ctx, 30);
    ctx.textAlign = 'left';
    ctx.fillText(SITE.shortName, 64, 100);
    blobs.push(await toBlob(c));
  }
  // الأخيرة: كل المواصفات + الكود
  const [c, ctx] = canvasOf(W, H);
  ctx.fillStyle = GREEN;
  ctx.fillRect(0, 0, W, H);
  header(ctx, W, 140);
  ctx.textAlign = 'right';
  font(ctx, 76);
  ctx.fillStyle = '#fff';
  ctx.fillText(offerTitle(offer), W - 64, 320);
  font(ctx, 46, 500);
  ctx.fillStyle = GREEN_SOFT;
  ctx.fillText(`${offerHeading(offer)} · ${offer.city}`, W - 64, 400);
  const rows = [
    offer.area ? ['المساحة', `${formatNumber(offer.area)} م²`] : null,
    offer.type !== 'land' && offer.rooms != null ? ['الغرف', String(offer.rooms)] : null,
    offer.type !== 'land' && offer.bathrooms != null ? ['دورات المياه', String(offer.bathrooms)] : null,
    offer.facade ? ['الواجهة', offer.facade] : null,
    offer.streetWidth ? ['عرض الشارع', `${offer.streetWidth} م`] : null,
  ].filter(Boolean);
  let y = 540;
  for (const [k, v] of rows) {
    font(ctx, 42, 500);
    ctx.fillStyle = GREEN_SOFT;
    ctx.textAlign = 'right';
    ctx.fillText(k, W - 64, y);
    font(ctx, 46);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.fillText(v, 64, y);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(64, y + 34, W - 128, 2);
    y += 100;
  }
  priceBlock(ctx, offer, W - 64, y + 110, 84);
  drawQr(ctx, qrcode, url, (W - 420) / 2, H - 700, 420);
  font(ctx, 40);
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.fillText('صوّر الكود وشوف الصور والتفاصيل', W / 2, H - 200);
  const wa = getWhatsAppDisplay();
  if (wa) {
    font(ctx, 36, 500);
    ctx.fillText(`واتساب ${wa}`, W / 2, H - 130);
  }
  blobs.push(await toBlob(c));
  return blobs;
}

// kind: 'story' | 'post' | 'carousel' → قائمة ملفات
export async function makeSocialImages(offer, siteUrl, kind, whatsappNumber) {
  waDisplay = localPhone(whatsappNumber);
  if (document.fonts?.ready) await document.fonts.ready;
  const qrcode = await loadQr();
  const url = `${siteUrl}/offers/${offer.id}`;
  const sources = offer.images?.length ? offer.images.map((i) => i.full) : [null];
  const images = await Promise.all((kind === 'carousel' ? sources.slice(0, 9) : sources.slice(0, 1)).map(loadImage));
  let blobs;
  if (kind === 'post') blobs = [await post(offer, url, images[0], qrcode)];
  else if (kind === 'carousel') blobs = await carousel(offer, url, images, qrcode);
  else blobs = [await story(offer, url, images[0], qrcode)];
  if (blobs.some((b) => !b)) throw new Error('canvas');
  const label = { story: 'ستوري', post: 'بوست', carousel: 'صور' }[kind];
  return blobs.map((b, i) => new File([b], `عرض-${offer.id}-${label}${blobs.length > 1 ? `-${i + 1}` : ''}.jpg`, { type: 'image/jpeg' }));
}

// مشاركة الملفات (قائمة الجوال) أو تنزيلها
export async function shareOrDownload(files) {
  if (navigator.canShare?.({ files })) {
    try {
      await navigator.share({ files });
      return 'shared';
    } catch (e) {
      if (e?.name === 'AbortError') return 'cancelled';
    }
  }
  for (const f of files) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f);
    a.download = f.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    await new Promise((r) => setTimeout(r, 250));
  }
  return 'downloaded';
}
