'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState, useTransition } from 'react';
import { createCity } from '@/app/admin/city-actions';
import { Switch } from '@/components/admin/CitiesList';
import DistrictsInput, { emptyDistricts } from '@/components/admin/DistrictsInput';
import { ChevronDownIcon, ChevronIcon } from '@/components/Icons';
import { loadCityCatalog, loadCityDistricts } from '@/lib/admin/city-catalog';
import { normalizeArabic } from '@/lib/format';

export default function NewCityForm({ regions = [] }) {
  const [name, setName] = useState('');
  const [visible, setVisible] = useState(false);
  const [region, setRegion] = useState('');
  const [catalog, setCatalog] = useState([]);
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState(null);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  useEffect(() => {
    loadCityCatalog().then(setCatalog);
  }, []);

  const suggestions = useMemo(() => {
    const q = normalizeArabic(name.trim());
    if (q.length < 2) return [];
    const starts = [];
    const contains = [];
    for (const c of catalog) {
      if (c.key.startsWith(q)) starts.push(c);
      else if (c.key.includes(q)) contains.push(c);
      if (starts.length >= 8) break;
    }
    return [...starts, ...contains].slice(0, 8);
  }, [catalog, name]);

  const pick = async (c) => {
    setName(c.name);
    setRegion(c.region);
    setPicked(c);
    setOpen(false);
    setErrors({});
    if (c.file) {
      setLoadingDistricts(true);
      const d = await loadCityDistricts(c.file).catch(() => null);
      setLoadingDistricts(false);
      if (d) setDistricts(d.value);
    }
  };
  const [districts, setDistricts] = useState(emptyDistricts);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: 'اكتب اسم المدينة' });
      return;
    }
    setErrors({});
    setMessage('');
    startTransition(async () => {
      const result = await createCity({ name, visible, districts, region });
      if (result && !result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? '');
      }
    });
  };

  return (
    <form className="offer-form" onSubmit={onSubmit} noValidate>
      <header className="admin-header admin-header--form">
        <Link href="/admin/cities" className="icon-btn" aria-label="رجوع للمدن">
          <ChevronIcon />
        </Link>
        <div className="admin-header__text">
          <h1>إضافة مدينة</h1>
          <p>مع أحيائها وجهاتها</p>
        </div>
      </header>

      <div className="admin-body">
        {message ? (
          <p className="admin-error" role="alert">
            {message}
          </p>
        ) : null}

        <section className="form-section">
          <div className={errors.name ? 'field-block has-error' : 'field-block'}>
            <label className="field-label" htmlFor="c-name">
              اسم المدينة<span className="field-required"> *</span>
            </label>
            <div className="field">
              <input
                id="c-name"
                type="text"
                role="combobox"
                aria-expanded={open && suggestions.length > 0}
                aria-controls="c-name-list"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setPicked(null);
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onBlur={() => setTimeout(() => setOpen(false), 150)}
                placeholder="اكتب اسم المدينة… مثلاً الدر"
                autoComplete="off"
              />
            </div>
            {open && suggestions.length ? (
              <ul className="combo__list city-suggest" id="c-name-list" role="listbox">
                {suggestions.map((c) => (
                  <li key={c.name} role="option" aria-selected="false" onMouseDown={(e) => e.preventDefault()} onClick={() => pick(c)}>
                    <span>{c.name}</span>
                    <small>
                      {c.region} · {c.count ? `${c.count} حي` : 'بدون أحياء رسمية'}
                    </small>
                  </li>
                ))}
              </ul>
            ) : null}
            {errors.name ? <p className="field-error">{errors.name}</p> : null}
          </div>
          {picked ? (
            <p className="city-picked">
              <b>{picked.name}</b> · {picked.region}
              <br />
              {loadingDistricts
                ? 'جاري جلب الأحياء…'
                : picked.count
                  ? `انضافت ${picked.count} حي تحت مع جهاتها ✓ (تقدر تعدّل قبل الحفظ)`
                  : 'ما لها أحياء رسمية: اكتب أحياءها تحت بنفسك'}
            </p>
          ) : null}
          <div className="field-block">
            <label className="field-label" htmlFor="c-region">
              المنطقة
            </label>
            <div className="field field--select">
              <select id="c-region" value={region} onChange={(e) => setRegion(e.target.value)}>
                <option value="">اختر المنطقة</option>
                {regions.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="field__chevron" />
            </div>
          </div>
          <div className="switch-row">
            <span>
              <strong>تظهر للعملاء</strong>
              <small>تبدأ مخفية، وتشغّلها لما تكون جاهز</small>
            </span>
            <Switch checked={visible} onChange={setVisible} label="تظهر للعملاء" />
          </div>
        </section>

        <section className="form-section">
          <h2>الأحياء حسب الجهة</h2>
          <DistrictsInput value={districts} onChange={setDistricts} />
        </section>
      </div>

      <div className="save-bar">
        <button type="submit" className="btn btn--primary btn--lg" disabled={isPending || loadingDistricts}>
          {isPending ? 'جاري الحفظ…' : 'اعتماد المدينة'}
        </button>
      </div>
    </form>
  );
}
