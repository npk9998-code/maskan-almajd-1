'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, useTransition } from 'react';
import { deleteOffer, discardUploads, saveOffer } from '@/app/admin/offer-actions';
import ImagePicker from '@/components/admin/ImagePicker';
import { ChevronIcon, LockIcon, PinIcon } from '@/components/Icons';
import { AGE_OPTIONS, DIRECTION_LABEL, FACADE_OPTIONS, FEATURE_OPTIONS, FLOOR_OPTIONS } from '@/lib/admin/options';
import { formatNumber } from '@/lib/format';

const TYPES = [
  { key: 'villa', label: 'فيلا' },
  { key: 'apartment', label: 'شقة' },
  { key: 'land', label: 'أرض' },
];

const PRICE_MODES = [
  { key: 'show', title: 'إظهار السعر', hint: 'يطلع المبلغ مثل ما كتبته' },
  { key: 'negotiable', title: 'إظهار السعر + قابل للتفاوض', hint: 'يطلع المبلغ وتحته "قابل للتفاوض"' },
  { key: 'hidden', title: 'إخفاء السعر', hint: 'يطلع "السعر عند التواصل" بدل المبلغ' },
];

const EMPTY = {
  id: null,
  type: 'villa',
  cityId: '',
  districtId: '',
  price: '',
  priceDisplay: 'show',
  area: '',
  rooms: '',
  bathrooms: '',
  ageYears: '',
  facade: '',
  streetWidth: '',
  floor: '',
  features: [],
  description: '',
  adLicense: '',
  notes: '',
  status: 'available',
  images: [],
};

// أرقام بس (ويحوّل الأرقام العربية)
const digits = (v, allowDot = false) => {
  const latin = String(v).replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
  return latin.replace(allowDot ? /[^\d.]/g : /\D/g, '').slice(0, 12);
};

function Section({ title, children, tone }) {
  return (
    <section className={tone ? `form-section form-section--${tone}` : 'form-section'}>
      {title}
      {children}
    </section>
  );
}

function Field({ label, error, required, children, htmlFor }) {
  return (
    <div className={error ? 'field-block has-error' : 'field-block'}>
      <label className="field-label" htmlFor={htmlFor}>
        {label}
        {required ? <span className="field-required" aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {error ? <p className="field-error">{error}</p> : null}
    </div>
  );
}

export default function OfferForm({ cities, districts, initial }) {
  const isEdit = Boolean(initial?.id);
  const [form, setForm] = useState(() => ({ ...EMPTY, ...initial }));
  const [images, setImages] = useState(() => initial?.images ?? []);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [customFeature, setCustomFeature] = useState('');
  const [isSaving, startSaving] = useTransition();
  const [isDeleting, startDeleting] = useTransition();
  const removedSaved = useRef([]);
  const topRef = useRef(null);

  const set = (key) => (e) => {
    const value = e?.target ? e.target.value : e;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const cityDistricts = useMemo(
    () => districts.filter((d) => String(d.city_id) === String(form.cityId)),
    [districts, form.cityId],
  );
  const district = cityDistricts.find((d) => String(d.id) === String(form.districtId));

  const onCityChange = (e) => {
    setForm((f) => ({ ...f, cityId: e.target.value, districtId: '' }));
    setErrors((er) => ({ ...er, city: undefined, district: undefined }));
  };

  const toggleFeature = (name) =>
    setForm((f) => ({
      ...f,
      features: f.features.includes(name) ? f.features.filter((x) => x !== name) : [...f.features, name],
    }));

  const addCustomFeature = () => {
    const name = customFeature.trim();
    if (!name) return;
    setForm((f) => (f.features.includes(name) ? f : { ...f, features: [...f.features, name] }));
    setCustomFeature('');
  };

  const onRemoveImage = (img) => {
    if (img.saved) removedSaved.current.push(img.image_path, img.thumb_path);
    else discardUploads([img.image_path, img.thumb_path]);
  };

  const featureChoices = useMemo(
    () => [...FEATURE_OPTIONS, ...form.features.filter((f) => !FEATURE_OPTIONS.includes(f))],
    [form.features],
  );

  const validate = () => {
    const e = {};
    if (!form.type) e.type = 'اختر نوع العقار';
    if (!form.cityId) e.city = 'اختر المدينة';
    if (!form.districtId) e.district = 'اختر الحي';
    if (!form.area || Number(form.area) <= 0) e.area = 'اكتب المساحة';
    if (form.priceDisplay !== 'hidden' && !form.price) e.price = 'اكتب السعر، أو اختر "إخفاء السعر"';
    return e;
  };

  const onSubmit = (e) => {
    e.preventDefault();
    setMessage('');
    const e2 = validate();
    setErrors(e2);
    if (Object.keys(e2).length) {
      setMessage('كمّل الحقول المطلوبة (عليها *)');
      topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    startSaving(async () => {
      const result = await saveOffer({
        ...form,
        images: images.map(({ image_path, thumb_path }) => ({ image_path, thumb_path })),
        removedPaths: removedSaved.current,
      });
      // لو نجح، السيرفر يرجعك لشاشة عروضي
      if (result && !result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message);
        topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  };

  const onDelete = () => {
    startDeleting(async () => {
      const result = await deleteOffer(form.id);
      if (result && !result.ok) setMessage(result.message);
    });
  };

  const isLand = form.type === 'land';
  const isApartment = form.type === 'apartment';
  const busy = isSaving || isDeleting;

  return (
    <form className="offer-form" onSubmit={onSubmit} noValidate>
      <header className="admin-header admin-header--form">
        <Link href="/admin" className="icon-btn" aria-label="رجوع لعروضي">
          <ChevronIcon />
        </Link>
        <div className="admin-header__text">
          <h1>{isEdit ? 'تعديل العرض' : 'إضافة عرض'}</h1>
          <p className="tabular">{isEdit ? `رقم العرض: ${form.id}` : 'رقم العرض يتولد تلقائياً عند الحفظ'}</p>
        </div>
      </header>

      <div className="admin-body" ref={topRef}>
        {message ? (
          <p className="admin-error" role="alert">
            {message}
          </p>
        ) : null}

        <Section
          title={
            <h2>
              الصور <span className="muted">(اختيارية)</span>
            </h2>
          }
        >
          <ImagePicker images={images} onChange={setImages} onRemoveSaved={onRemoveImage} onBusyChange={setUploading} />
        </Section>

        <Section title={<h2>البيانات الأساسية</h2>}>
          <Field label="نوع العقار" required error={errors.type}>
            <div className="segmented" role="radiogroup" aria-label="نوع العقار">
              {TYPES.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="radio"
                  aria-checked={form.type === t.key}
                  className={form.type === t.key ? 'is-active' : undefined}
                  onClick={() => set('type')(t.key)}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <div className="form-grid">
            <Field label="المدينة" required error={errors.city} htmlFor="f-city">
              <div className="field field--select">
                <select id="f-city" value={form.cityId} onChange={onCityChange}>
                  <option value="">اختر</option>
                  {cities.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.is_visible ? '' : ' (مخفية)'}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            <Field label="الحي" required error={errors.district} htmlFor="f-district">
              <div className="field field--select">
                <select
                  id="f-district"
                  value={form.districtId}
                  onChange={set('districtId')}
                  disabled={!form.cityId}
                >
                  <option value="">{form.cityId ? 'اختر' : 'اختر المدينة أول'}</option>
                  {cityDistricts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
          </div>

          {district ? (
            <p className="direction-note">
              <PinIcon className="icon-sm" />
              <span>موقع الحي: {DIRECTION_LABEL[district.direction]} (يتحدد تلقائياً)</span>
            </p>
          ) : null}
        </Section>

        <Section title={<h2>السعر</h2>}>
          <Field label="المبلغ بالريال" error={errors.price} htmlFor="f-price">
            <div className="field">
              <input
                id="f-price"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="tabular"
                value={form.price ? formatNumber(Number(form.price)) : ''}
                onChange={(e) => set('price')(digits(e.target.value))}
                placeholder="مثال: 2,450,000"
              />
            </div>
          </Field>
          <fieldset className="price-modes">
            <legend className="field-label">كيف يظهر السعر للعميل؟</legend>
            {PRICE_MODES.map((m) => (
              <label key={m.key} className={form.priceDisplay === m.key ? 'radio-card is-active' : 'radio-card'}>
                <input
                  type="radio"
                  name="priceDisplay"
                  value={m.key}
                  checked={form.priceDisplay === m.key}
                  onChange={() => {
                    set('priceDisplay')(m.key);
                    setErrors((er) => ({ ...er, price: undefined }));
                  }}
                />
                <span>
                  <strong>{m.title}</strong>
                  <small>{m.hint}</small>
                </span>
              </label>
            ))}
          </fieldset>
        </Section>

        <Section title={<h2>المواصفات</h2>}>
          <div className="form-grid">
            <Field label="المساحة (م²)" required error={errors.area} htmlFor="f-area">
              <div className="field">
                <input
                  id="f-area"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  className="tabular"
                  value={form.area}
                  onChange={(e) => set('area')(digits(e.target.value, true))}
                />
              </div>
            </Field>
            {!isLand ? (
              <>
                <Field label="الغرف" htmlFor="f-rooms">
                  <div className="field">
                    <input
                      id="f-rooms"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="tabular"
                      value={form.rooms}
                      onChange={(e) => set('rooms')(digits(e.target.value).slice(0, 2))}
                    />
                  </div>
                </Field>
                <Field label="دورات المياه" htmlFor="f-baths">
                  <div className="field">
                    <input
                      id="f-baths"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      className="tabular"
                      value={form.bathrooms}
                      onChange={(e) => set('bathrooms')(digits(e.target.value).slice(0, 2))}
                    />
                  </div>
                </Field>
                <Field label="عمر العقار" htmlFor="f-age">
                  <div className="field field--select">
                    <select id="f-age" value={String(form.ageYears)} onChange={set('ageYears')}>
                      <option value="">—</option>
                      {AGE_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </Field>
              </>
            ) : null}
            <Field label="الواجهة" htmlFor="f-facade">
              <div className="field field--select">
                <select id="f-facade" value={form.facade} onChange={set('facade')}>
                  <option value="">—</option>
                  {FACADE_OPTIONS.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
              </div>
            </Field>
            {isApartment ? (
              <Field label="الدور" htmlFor="f-floor">
                <div className="field field--select">
                  <select id="f-floor" value={String(form.floor)} onChange={set('floor')}>
                    <option value="">—</option>
                    {FLOOR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
              </Field>
            ) : (
              <Field label="عرض الشارع (م)" htmlFor="f-street">
                <div className="field">
                  <input
                    id="f-street"
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    className="tabular"
                    value={form.streetWidth}
                    onChange={(e) => set('streetWidth')(digits(e.target.value, true).slice(0, 5))}
                  />
                </div>
              </Field>
            )}
          </div>
        </Section>

        <Section title={<h2>المميزات</h2>}>
          <div className="feature-chips">
            {featureChoices.map((f) => {
              const active = form.features.includes(f);
              return (
                <button
                  key={f}
                  type="button"
                  className={active ? 'pill pill--round is-active' : 'pill pill--round'}
                  aria-pressed={active}
                  onClick={() => toggleFeature(f)}
                >
                  {f}
                </button>
              );
            })}
          </div>
          <div className="feature-add">
            <div className="field">
              <input
                type="text"
                value={customFeature}
                onChange={(e) => setCustomFeature(e.target.value.slice(0, 40))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCustomFeature();
                  }
                }}
                placeholder="ميزة ثانية…"
                aria-label="إضافة ميزة ثانية"
                autoComplete="off"
              />
            </div>
            <button type="button" className="btn btn--outline" onClick={addCustomFeature}>
              إضافة
            </button>
          </div>
        </Section>

        <Section title={<h2>نبذة عن العقار</h2>}>
          <div className="field">
            <textarea
              rows={4}
              maxLength={1000}
              value={form.description}
              onChange={set('description')}
              placeholder="التشطيب، الإطلالة، القرب من الخدمات… بدون اسم الشارع"
              aria-label="نبذة عن العقار"
            />
          </div>
          <Field label="رقم ترخيص الإعلان" htmlFor="f-license">
            <div className="field">
              <input
                id="f-license"
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className="tabular"
                value={form.adLicense}
                onChange={(e) => set('adLicense')(e.target.value.slice(0, 40))}
              />
            </div>
          </Field>
        </Section>

        <Section
          tone="private"
          title={
            <h2 className="private-title">
              <LockIcon className="icon-sm" /> ملاحظات خاصة
            </h2>
          }
        >
          <p className="field-hint">ما تظهر للعملاء أبداً، لك أنت بس</p>
          <div className="field">
            <textarea
              rows={4}
              maxLength={4000}
              value={form.notes}
              onChange={set('notes')}
              placeholder="الموقع الدقيق، رقم المالك أو المسوّق، العمولة…"
              aria-label="ملاحظات خاصة"
            />
          </div>
        </Section>

        <Section title={<h2>حالة العرض</h2>}>
          <div className="segmented" role="radiogroup" aria-label="حالة العرض">
            {[
              { key: 'available', label: 'معروض للعملاء' },
              { key: 'hidden', label: 'مخفي' },
              ...(isEdit && initial?.status === 'sold' ? [{ key: 'sold', label: 'تم البيع' }] : []),
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                role="radio"
                aria-checked={form.status === s.key}
                className={form.status === s.key ? 'is-active' : undefined}
                onClick={() => set('status')(s.key)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </Section>

        {isEdit ? (
          <section className="danger-zone">
            {confirmDelete ? (
              <>
                <p>
                  متأكد تبي تحذف العرض رقم {form.id} نهائياً؟ الصور والملاحظات تنحذف معه، وما يرجع.
                </p>
                <div className="danger-zone__actions">
                  <button type="button" className="btn btn--danger" onClick={onDelete} disabled={busy}>
                    {isDeleting ? 'جاري الحذف…' : 'ايه، احذفه نهائياً'}
                  </button>
                  <button type="button" className="btn btn--outline" onClick={() => setConfirmDelete(false)} disabled={busy}>
                    تراجع
                  </button>
                </div>
              </>
            ) : (
              <button type="button" className="btn btn--danger-outline" onClick={() => setConfirmDelete(true)}>
                حذف العرض
              </button>
            )}
          </section>
        ) : null}
      </div>

      <div className="save-bar">
        <button type="submit" className="btn btn--primary btn--lg" disabled={busy || uploading}>
          {isSaving ? 'جاري الحفظ…' : uploading ? 'انتظر رفع الصور…' : 'حفظ العرض'}
        </button>
      </div>
    </form>
  );
}
