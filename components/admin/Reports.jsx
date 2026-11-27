'use client';

import Link from 'next/link';
import { ChatIcon, DownloadIcon, EyeIcon, UserIcon } from '@/components/Icons';
import { formatNumber } from '@/lib/format';
import { SITE } from '@/lib/site';

const dateText = (day) =>
  new Intl.DateTimeFormat('ar-SA-u-nu-latn-ca-gregory', { day: 'numeric', month: 'long' }).format(new Date(`${day}T12:00:00`));

function Stat({ label, Icon, value, change }) {
  const up = change > 0;
  const down = change < 0;
  return (
    <div className="rep-stat">
      <dt>
        <Icon className="icon-xs" /> {label}
      </dt>
      <dd className="tabular">{formatNumber(value)}</dd>
      <span className={up ? 'rep-change is-up' : down ? 'rep-change is-down' : 'rep-change'}>
        {up ? '⬆️' : down ? '⬇️' : '•'} {change === 0 ? 'نفس الأسبوع اللي قبله' : `${Math.abs(change)}٪ عن الأسبوع اللي قبله`}
      </span>
    </div>
  );
}

function OfferList({ items, metric, unit, empty }) {
  if (!items.length) return <p className="empty">{empty}</p>;
  return (
    <ol className="rep-list">
      {items.map((o) => (
        <li key={o.id}>
          <Link href={`/admin/offers/${o.id}/edit`}>
            <span>
              <b>
                {o.title} · حي {o.district}
              </b>
              <small className="tabular">
                رقم {o.id} · {o.city}
              </small>
            </span>
            <span className="rep-list__num tabular">
              {formatNumber(o[metric])} {unit}
            </span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function Chart({ data }) {
  const W = 600;
  const H = 180;
  const max = Math.max(1, ...data.map((d) => d.visits));
  const bw = W / data.length;
  return (
    <figure className="rep-chart">
      <svg viewBox={`0 0 ${W} ${H + 24}`} role="img" aria-label="الزيارات يوم بيوم لآخر ٣٠ يوم">
        {[0.5, 1].map((t) => (
          <line key={t} x1="0" x2={W} y1={H - H * t} y2={H - H * t} stroke="#e5e2da" strokeWidth="1" />
        ))}
        {data.map((d, i) => {
          const h = (d.visits / max) * (H - 10);
          return (
            <rect key={d.day} x={W - (i + 1) * bw + 2} y={H - h} width={bw - 4} height={Math.max(h, d.visits ? 2 : 0)} rx="3" fill="#0f5c4d">
              <title>{`${dateText(d.day)}: ${d.visits} زيارة`}</title>
            </rect>
          );
        })}
        <text x={W - 2} y={H + 18} textAnchor="end" fontSize="12" fill="#6b6a64">
          {dateText(data[0].day)}
        </text>
        <text x="2" y={H + 18} textAnchor="start" fontSize="12" fill="#6b6a64">
          {dateText(data[data.length - 1].day)}
        </text>
      </svg>
      <figcaption className="tabular">أعلى يوم: {formatNumber(max)} زيارة</figcaption>
    </figure>
  );
}

export default function Reports({ report }) {
  const r = report;
  const print = () => {
    const prev = document.title;
    document.title = `تقرير-${SITE.shortName.replace(/\s+/g, '-')}-${r.range.to}`;
    window.print();
    setTimeout(() => {
      document.title = prev;
    }, 1000);
  };

  return (
    <div className="admin-body reports">
      <div className="rep-head">
        <div>
          <p className="rep-brand">{SITE.name}</p>
          <p className="muted tabular">
            الأسبوع من {dateText(r.range.from)} إلى {dateText(r.range.to)}
          </p>
        </div>
        <button type="button" className="btn btn--primary no-print" onClick={print}>
          <DownloadIcon className="icon-sm" /> تحميل PDF
        </button>
      </div>

      <section className="rep-section">
        <h2>ملخص الأسبوع</h2>
        <dl className="rep-stats">
          <Stat label="زوار الموقع" Icon={UserIcon} value={r.summary.people.value} change={r.summary.people.change} />
          <Stat label="الزيارات" Icon={EyeIcon} value={r.summary.visits.value} change={r.summary.visits.change} />
          <Stat label="مشاهدات العروض" Icon={EyeIcon} value={r.summary.views.value} change={r.summary.views.change} />
          <Stat label="ضغطات واتساب" Icon={ChatIcon} value={r.summary.whatsapp.value} change={r.summary.whatsapp.change} />
        </dl>
      </section>

      <section className="rep-section">
        <h2>أكثر ٥ عروض مشاهدة هالأسبوع</h2>
        <OfferList items={r.topViews} metric="views" unit="مشاهدة" empty="ما فيه مشاهدات هالأسبوع للحين." />
      </section>

      <section className="rep-section">
        <h2>أكثر ٥ عروض جابت واتساب</h2>
        <OfferList items={r.topWhatsapp} metric="whatsapp" unit="واتساب" empty="ما فيه ضغطات واتساب هالأسبوع للحين." />
      </section>

      <section className="rep-section rep-section--warn">
        <h2>⚠️ عروض تحتاج انتباه</h2>
        <h3>يشوفونها كثير وما أحد يراسل (غالباً السعر أو الصور)</h3>
        <OfferList items={r.noContact} metric="totalViews" unit="مشاهدة" empty="ما فيه، ممتاز 👌" />
        <h3>لها أكثر من ٣٠ يوم ومشاهداتها قليلة (فكّر تنزّل السعر أو تخليها فرصة)</h3>
        <OfferList items={r.stale} metric="totalViews" unit="مشاهدة" empty="ما فيه، ممتاز 👌" />
      </section>

      <section className="rep-section">
        <h2>وش يدوّر عليه العملاء وما لقوه (آخر ٣٠ يوم)</h2>
        {r.searchMisses.length ? (
          <ol className="rep-list rep-list--plain">
            {r.searchMisses.map((m) => (
              <li key={m.label}>
                <span>{m.label}</span>
                <span className="rep-list__num tabular">{m.hits} مرة</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="empty">للحين ما فيه بحث بدون نتيجة.</p>
        )}
      </section>

      <section className="rep-section">
        <h2>ملخص الشهر</h2>
        <dl className="rep-stats rep-stats--month">
          <div className="rep-stat">
            <dt>عروض نزلت</dt>
            <dd className="tabular">{r.month.published}</dd>
          </div>
          <div className="rep-stat">
            <dt>انباعت</dt>
            <dd className="tabular">{r.month.sold}</dd>
          </div>
          <div className="rep-stat">
            <dt>طلبات «اعرض عقارك»</dt>
            <dd className="tabular">{r.month.requests}</dd>
          </div>
          <div className="rep-stat">
            <dt>معروضة الحين</dt>
            <dd className="tabular">{r.month.live}</dd>
          </div>
        </dl>
      </section>

      <section className="rep-section">
        <h2>الزيارات آخر ٣٠ يوم</h2>
        <Chart data={r.chart} />
      </section>

      <p className="rep-note muted">الأرقام تبدأ من يوم تفعيل التقارير، وزياراتك أنت ما تنحسب.</p>
    </div>
  );
}
