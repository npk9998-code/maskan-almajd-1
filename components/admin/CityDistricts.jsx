'use client';

import Link from 'next/link';
import { useMemo, useState, useTransition } from 'react';
import { addDistricts, deleteDistrict, setCityVisible, setDistrictDirection } from '@/app/admin/city-actions';
import { Switch } from '@/components/admin/CitiesList';
import DistrictsInput, { DIRECTION_KEYS, emptyDistricts } from '@/components/admin/DistrictsInput';
import { ChevronIcon, SearchIcon } from '@/components/Icons';
import { DIRECTION_LABEL } from '@/lib/admin/options';
import { normalizeArabic } from '@/lib/format';

export default function CityDistricts({ city, districts }) {
  const [visible, setVisible] = useState(city.visible);
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);
  const [newDistricts, setNewDistricts] = useState(emptyDistricts);
  const [message, setMessage] = useState({ text: '', tone: '' });
  const [busyId, setBusyId] = useState(null);
  const [isPending, startTransition] = useTransition();

  const groups = useMemo(() => {
    const q = normalizeArabic(query.trim());
    const filtered = q ? districts.filter((d) => normalizeArabic(d.name).includes(q)) : districts;
    return DIRECTION_KEYS.map((key) => ({ key, items: filtered.filter((d) => d.direction === key) }));
  }, [districts, query]);

  const run = (fn, id) => {
    setMessage({ text: '', tone: '' });
    setBusyId(id ?? null);
    startTransition(async () => {
      const result = await fn();
      if (!result?.ok) setMessage({ text: result?.message ?? 'صار خطأ', tone: 'error' });
      else if (result.added != null) {
        setMessage({
          text: `انضاف ${result.added} حي${result.skipped ? `، و${result.skipped} كانت موجودة من قبل` : ''} ✓`,
          tone: 'ok',
        });
        setNewDistricts(emptyDistricts());
        setAdding(false);
      }
      setBusyId(null);
    });
  };

  return (
    <div className="offer-form">
      <header className="admin-header admin-header--form">
        <Link href="/admin/cities" className="icon-btn" aria-label="رجوع للمدن">
          <ChevronIcon />
        </Link>
        <div className="admin-header__text">
          <h1>{city.name}</h1>
          <p className="tabular">{districts.length} حي</p>
        </div>
      </header>

      <div className="admin-body">
        <section className="form-section">
          <div className="switch-row">
            <span>
              <strong>{visible ? 'ظاهرة للعملاء' : 'مخفية'}</strong>
              <small>المدينة المطفية تختفي هي وعروضها من الموقع</small>
            </span>
            <Switch
              checked={visible}
              onChange={(v) => {
                setVisible(v);
                run(() => setCityVisible(city.id, v));
              }}
              label="تظهر للعملاء"
            />
          </div>
        </section>

        {message.text ? (
          <p className={message.tone === 'ok' ? 'admin-ok' : 'admin-error'} role="status">
            {message.text}
          </p>
        ) : null}

        <section className="form-section">
          {adding ? (
            <>
              <h2>إضافة أحياء</h2>
              <DistrictsInput value={newDistricts} onChange={setNewDistricts} />
              <div className="danger-zone__actions">
                <button
                  type="button"
                  className="btn btn--primary"
                  disabled={isPending}
                  onClick={() => run(() => addDistricts(city.id, newDistricts))}
                >
                  {isPending ? 'جاري الإضافة…' : 'إضافة الأحياء'}
                </button>
                <button type="button" className="btn btn--outline" onClick={() => setAdding(false)}>
                  إلغاء
                </button>
              </div>
            </>
          ) : (
            <button type="button" className="add-city" onClick={() => setAdding(true)}>
              <span aria-hidden="true">+</span> إضافة أحياء
            </button>
          )}
        </section>

        {districts.length > 8 ? (
          <label className="search">
            <SearchIcon className="search__icon" />
            <span className="sr-only">ابحث عن حي</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن حي…"
              autoComplete="off"
            />
          </label>
        ) : null}

        {groups.map(({ key, items }) =>
          items.length ? (
            <section key={key} className="form-section">
              <h2>
                {DIRECTION_LABEL[key]} <span className="muted tabular">({items.length})</span>
              </h2>
              <ul className="district-list">
                {items.map((d) => (
                  <li key={d.id} aria-busy={busyId === d.id || undefined}>
                    <span className="district-list__name">
                      {d.name}
                      {d.listings ? <small className="tabular"> · {d.listings} عرض</small> : null}
                    </span>
                    <div className="field field--select district-list__dir">
                      <select
                        value={d.direction}
                        aria-label={`جهة حي ${d.name}`}
                        disabled={busyId === d.id}
                        onChange={(e) => run(() => setDistrictDirection(d.id, e.target.value), d.id)}
                      >
                        {DIRECTION_KEYS.map((k) => (
                          <option key={k} value={k}>
                            {DIRECTION_LABEL[k]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <button
                      type="button"
                      className="district-list__delete"
                      aria-label={`حذف حي ${d.name}`}
                      disabled={busyId === d.id}
                      onClick={() => {
                        if (window.confirm(`تحذف حي ${d.name}؟`)) run(() => deleteDistrict(d.id), d.id);
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )}
      </div>
    </div>
  );
}
