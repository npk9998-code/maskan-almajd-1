// معلومات المكتب — تتعدل من هنا
export const SITE = {
  name: 'مسكن المجد للعقارات',
  shortName: 'مسكن المجد',
  tagline: 'وسيط عقاري مرخّص',
  // رقم رخصة فال — يتعبأ لاحقاً
  falLicense: null,
};

// رقم الواتس من إعدادات Netlify (WHATSAPP_NUMBER) بصيغة دولية بدون + مثل 9665XXXXXXXX
export function getWhatsAppNumber() {
  const digits = (process.env.WHATSAPP_NUMBER ?? '').replace(/\D/g, '');
  if (!digits) return null;
  if (digits.startsWith('05')) return `966${digits.slice(1)}`;
  if (digits.startsWith('00')) return digits.slice(2);
  return digits;
}
