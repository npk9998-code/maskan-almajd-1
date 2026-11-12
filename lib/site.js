// معلومات المكتب — تتعدل من هنا
export const SITE = {
  name: 'مسكن المجد للعقارات',
  shortName: 'مسكن المجد',
  tagline: 'وسيط عقاري مرخّص',
};

// رخصة فال من إعدادات Netlify (FAL_LICENSE)
export const getFalLicense = () => process.env.FAL_LICENSE?.trim() || null;

// رابط الموقع (Netlify يعطيه تلقائياً باسم URL)
export function getSiteUrl() {
  const url = process.env.SITE_URL || process.env.URL || 'https://maskan-almajd-offers.netlify.app';
  return url.replace(/\/+$/, '');
}

// رقم الواتس من إعدادات Netlify (WHATSAPP_NUMBER) بصيغة دولية بدون + مثل 9665XXXXXXXX
export function getWhatsAppNumber() {
  const digits = (process.env.WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('05')) return `966${digits.slice(1)}`;
  if (digits.startsWith('00')) return digits.slice(2);
  return digits;
}
