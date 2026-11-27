'use client';

import Link from 'next/link';
import { useMemo, useRef, useState, useTransition } from 'react';
import { deleteOffer, discardUploads, saveOffer } from '@/app/admin/offer-actions';
import DistrictCombobox from '@/components/admin/DistrictCombobox';
import ImagePicker from '@/components/admin/ImagePicker';
import SuggestInput from '@/components/admin/SuggestInput';
import { ChatIcon, ChevronIcon, LockIcon, PinIcon } from '@/components/Icons';
import {
  AGE_OPTIONS,
  CUSTOM_TYPE_OPTIONS,
  DIRECTION_LABEL,
  FACADE_OPTIONS,
  FEATURE_OPTIONS,
  FLOOR_OPTIONS,
} from '@/lib/admin/options';
import { formatNumber } from '@/lib/format';

const TYPES = [
  { key: 'villa', label: 'فيلا' },
  { key: 'apartment', label: 'شقة' },
  { key: 'land', label: 'أرض' },
  { key: 'other', label: 'أخرى' },
];

const PRICE_MODES = [
  { key: 'show', title: 'إظهار السعر', hint: 'يطلع المبلغ مثل ما كتبته' },
  { key: 'negotiable', title: 'إظهار السعر + قابل للتفاوض', hint: 'يطلع المبلغ وتحته "قابل للتفاوض"' },
  { key: 'hidden', title: 'إخفاء السعر', hint: 'يطلع "السعر عند التواصل" بدل المبلغ' },
];

const EMPTY = {
  id: null,
  type: 'villa',
  customType: '',
  cityId: '',
  districtId: '',
  price: '',
  priceDisplay: 'show',
  showPricePerMeter: false,
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
  ownerName: '',
  ownerPhone: '',
  featured: false,
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

export default function OfferForm({ cities, districts, usedTypes = [], initial }) {
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

  const onDistrictSelect = (d) => {
    setForm((f) => (d ? { ...f, districtId: d.id, cityId: d.city_id } : { ...f, districtId: '' }));
    if (d) setErrors((er) => ({ ...er, city: undefined, district: undefined }));
  };

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
    if (form.type === 'other' && !form.customType.trim()) e.customType = 'اكتب نوع العقار';
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
  const isOther = form.type === 'other';
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

          {isOther ? (
            <Field label="اكتب نوع العقار" required error={errors.customType} htmlFor="f-custom-type">
              <SuggestInput
                id="f-custom-type"
                value={form.customType}
                onChange={(v) => {
                  setForm((f) => ({ ...f, customType: v }));
                  if (errors.customType) setErrors((er) => ({ ...er, customType: undefined }));
                }}
                suggestions={[...usedTypes, ...CUSTOM_TYPE_OPTIONS]}
                placeholder="مثل: عمارة، محطة بنزين…"
                error={errors.customType}
              />
            </Field>
          ) : null}

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
              <DistrictCombobox
                districts={districts}
                cities={cities}
                cityId={form.cityId}
                districtId={form.districtId}
                error={errors.district}
                onSelect={onDistrictSelect}
              />
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
          <label className={form.priceDisplay === 'hidden' ? 'check-row is-disabled' : 'check-row'}>
            <input
              type="checkbox"
              checked={form.showPricePerMeter && form.priceDisplay !== 'hidden'}
              disabled={form.priceDisplay === 'hidden'}
              onChange={(e) => setForm((f) => ({ ...f, showPricePerMeter: e.target.checked }))}
            />
            <span>
              <strong>إظهار سعر المتر</strong>
              <small className="tabular">
                {form.priceDisplay === 'hidden'
                  ? 'ما يطلع لأن السعر مخفي'
                  : form.price && Number(form.area) > 0
                    ? `يطلع للعميل: ${formatNumber(Math.round(Number(form.price) / Number(form.area)))} ريال/م²`
                    : 'يتحسب لحاله من السعر والمساحة'}
              </small>
            </span>
          </label>
          <label className="check-row check-row--gold">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => setForm((f) => ({ ...f, featured: e.target.checked }))}
            />
            <span>
              <strong>✨ عرض مميز (فرصة)</strong>
              <small>يطلع أول شي بإطار ذهبي وشارة «فرصة». الحد ٨ عروض.</small>
            </span>
          </label>
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
            {isApartment || isOther ? (
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
            ) : null}
            {!isApartment ? (
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
            ) : null}
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
              <LockIcon className="icon-sm" /> بيانات خاصة
            </h2>
          }
        >
          <p className="field-hint">ما تظهر للعملاء أبداً، لك أنت بس</p>
          <Field label="اسم المالك" htmlFor="f-owner">
            <div className="field">
              <input
                id="f-owner"
                type="text"
                autoComplete="off"
                maxLength={80}
                value={form.ownerName}
                onChange={set('ownerName')}
                placeholder="محمد ****"
              />
            </div>
          </Field>
          <Field label="جوال المالك" htmlFor="f-owner-phone">
            <div className="owner-phone">
              <div className="field">
                <input
                  id="f-owner-phone"
                  type="tel"
                  inputMode="tel"
                  dir="ltr"
                  autoComplete="off"
                  className="tabular"
                  maxLength={16}
                  value={form.ownerPhone}
                  onChange={(e) => setForm((f) => ({ ...f, ownerPhone: e.target.value.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d+ ]/g, '') }))}
                  placeholder="05********"
                />
              </div>
              {form.ownerPhone.replace(/\D/g, '').length >= 9 ? (
                <a
                  className="btn btn--wa btn--icon"
                  href={`https://wa.me/${(() => {
                    const d = form.ownerPhone.replace(/\D/g, '');
                    return d.startsWith('05') ? `966${d.slice(1)}` : d.startsWith('00') ? d.slice(2) : d;
                  })()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="واتساب المالك"
                >
                  <ChatIcon />
                </a>
              ) : null}
            </div>
          </Field>
          <Field label="ملاحظات" htmlFor="f-notes">
          <div className="field">
            <textarea
              rows={4}
              maxLength={4000}
              value={form.notes}
              onChange={set('notes')}
              id="f-notes"
              placeholder="الموقع الدقيق، العمولة، رقم الصك…"
            />
          </div>
          </Field>
        </Section>

        <Section title={<h2>حالة العرض</h2>}>
          <div className="segmented" role="radiogroup" aria-label="حالة العرض">
            {[
              { key: 'available', label: 'معروض للعملاء' },
              { key: 'hidden', label: 'مخفي' },
              ...(isEdit && initial?.status === 'sold' ? [{ key: 'sold', label: 'تم البيع' }] : []),
              ...(isEdit && initial?.status === 'pending' ? [{ key: 'pending', label: 'بانتظار النشر' }] : []),
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
                  متأكد تبي تحذف العرض رقم {form.id}؟ ينتقل لسلة المحذوفات ٣٠ يوم، وتقدر ترجعه منها.
                </p>
                <div className="danger-zone__actions">
                  <button type="button" className="btn btn--danger" onClick={onDelete} disabled={busy}>
                    {isDeleting ? 'جاري الحذف…' : 'ايه، احذفه'}
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
