// تجهيز أرقام التقارير (السيرفر بس)
import { adminSelect } from '@/lib/admin/api';
import { TYPE_LABEL, formatNumber, offerTitle } from '@/lib/format';

const DAY = 86_400_000;
const riyadhDay = (d) => new Date(d.getTime() + 3 * 3600_000).toISOString().slice(0, 10);

function sumBy(rows, from, to, key) {
  let n = 0;
  for (const r of rows) if (r.day >= from && r.day <= to) n += r[key] ?? 0;
  return n;
}

const change = (now, before) => (before ? Math.round(((now - before) / before) * 100) : now ? 100 : 0);

export async function getReport(token) {
  const now = new Date();
  const today = riyadhDay(now);
  const d = (n) => riyadhDay(new Date(now.getTime() - n * DAY));
  const from60 = d(59);
  const monthStart = `${today.slice(0, 7)}-01`;

  const [site, daily, listings, misses, subs] = await Promise.all([
    adminSelect(`site_daily_stats?select=day,visits,people&day=gte.${from60}&order=day.asc`, token).catch(() => []),
    adminSelect(`listing_daily_stats?select=listing_id,day,views,people,whatsapp&day=gte.${d(13)}`, token).catch(() => []),
    adminSelect(
      'listings?select=id,property_type,custom_type,status,created_at,published_at,updated_at,is_featured,district:districts(name,city:cities(name)),stats:listing_stats(total_views,whatsapp_clicks)&deleted_at=is.null',
      token,
    ),
    adminSelect(`search_misses?select=city,district,type,budget,hits&day=gte.${d(29)}`, token).catch(() => []),
    adminSelect(`submissions?select=id,created_at&created_at=gte.${monthStart}`, token).catch(() => []),
  ]);

  const byId = new Map(
    listings.map((l) => [
      l.id,
      {
        id: l.id,
        title: offerTitle({ type: l.property_type, customType: l.custom_type }),
        district: l.district?.name ?? '',
        city: l.district?.city?.name ?? '',
        status: l.status,
        featured: l.is_featured,
        publishedAt: l.published_at ?? l.created_at,
        totalViews: (Array.isArray(l.stats) ? l.stats[0] : l.stats)?.total_views ?? 0,
        totalWa: (Array.isArray(l.stats) ? l.stats[0] : l.stats)?.whatsapp_clicks ?? 0,
      },
    ]),
  );

  // الأسبوع مقابل اللي قبله
  const w = { from: d(6), to: today };
  const p = { from: d(13), to: d(7) };
  const week = {
    visits: sumBy(site, w.from, w.to, 'visits'),
    people: sumBy(site, w.from, w.to, 'people'),
    views: sumBy(daily, w.from, w.to, 'views'),
    whatsapp: sumBy(daily, w.from, w.to, 'whatsapp'),
  };
  const prev = {
    visits: sumBy(site, p.from, p.to, 'visits'),
    people: sumBy(site, p.from, p.to, 'people'),
    views: sumBy(daily, p.from, p.to, 'views'),
    whatsapp: sumBy(daily, p.from, p.to, 'whatsapp'),
  };
  const summary = Object.fromEntries(Object.keys(week).map((k) => [k, { value: week[k], change: change(week[k], prev[k]) }]));

  // أكثر العروض هالأسبوع
  const perListing = new Map();
  for (const r of daily) {
    if (r.day < w.from) continue;
    const s = perListing.get(r.listing_id) ?? { views: 0, whatsapp: 0 };
    s.views += r.views;
    s.whatsapp += r.whatsapp;
    perListing.set(r.listing_id, s);
  }
  const ranked = [...perListing.entries()].map(([id, s]) => ({ ...byId.get(id), ...s })).filter((x) => x.id);
  const topViews = ranked.filter((x) => x.views).sort((a, b) => b.views - a.views).slice(0, 5);
  const topWhatsapp = ranked.filter((x) => x.whatsapp).sort((a, b) => b.whatsapp - a.whatsapp).slice(0, 5);

  // عروض تحتاج انتباه
  const live = [...byId.values()].filter((l) => l.status === 'available');
  const noContact = live
    .filter((l) => l.totalViews >= 30 && l.totalWa / l.totalViews < 0.02)
    .sort((a, b) => b.totalViews - a.totalViews)
    .slice(0, 5);
  const stale = live
    .filter((l) => now - new Date(l.publishedAt) > 30 * DAY && l.totalViews < 20)
    .sort((a, b) => a.totalViews - b.totalViews)
    .slice(0, 5);

  // وش يدورون عليه وما لقوه
  const missMap = new Map();
  for (const m of misses) {
    const label = [
      m.type ? TYPE_LABEL[m.type] : null,
      m.city || null,
      m.district ? `حي ${m.district}` : null,
      m.budget ? `بحدود ${formatNumber(m.budget)} ريال` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    if (!label) continue;
    missMap.set(label, (missMap.get(label) ?? 0) + m.hits);
  }
  const searchMisses = [...missMap.entries()]
    .map(([label, hits]) => ({ label, hits }))
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 8);

  // ملخص الشهر
  const all = [...byId.values()];
  const month = {
    published: all.filter((l) => l.publishedAt >= monthStart && l.status !== 'pending').length,
    sold: listings.filter((l) => l.status === 'sold' && (l.updated_at ?? '') >= monthStart).length,
    requests: subs.length,
    live: live.length,
  };

  // آخر ٣٠ يوم يوم بيوم
  const visitsByDay = new Map(site.map((r) => [r.day, r.visits]));
  const chart = Array.from({ length: 30 }, (_, i) => {
    const day = d(29 - i);
    return { day, visits: visitsByDay.get(day) ?? 0 };
  });

  return { generatedAt: now.toISOString(), range: { from: w.from, to: w.to }, summary, topViews, topWhatsapp, noContact, stale, searchMisses, month, chart };
}
