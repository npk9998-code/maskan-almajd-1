'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { submitProperty, uploadSubmissionImage } from '@/app/submit-actions';
import SuggestInput from '@/components/admin/SuggestInput';
import { ChatIcon, ChevronDownIcon, CloseIcon } from '@/components/Icons';
import { AGE_OPTIONS, CUSTOM_TYPE_OPTIONS, FACADE_OPTIONS, FLOOR_OPTIONS } from '@/lib/admin/options';
import { processImage } from '@/lib/admin/image-processing';
import { TYPE_LABEL, whatsappLink } from '@/lib/format';
import { SITE } from '@/lib/site';

const DRAFT_KEY = 'mz_submit_draft';
const DEVICE_KEY = 'mz_dev';
const MAX_IMAGES = 10;
const TYPES = ['villa', 'apartment', 'land', 'other'];
const STEPS = ['بياناتك', 'بيانات العقار', 'الصور والموافقة'];

const EMPTY = {
  name: '',
  phone: '',
  type: 'villa',
  customType: '',
  city: '',
  district: '',
  area: '',
  price: '',
  rooms: '',
  bathrooms: '',
  ageYears: '',
  facade: '',
  streetWidth: '',
  floor: '',
  deed: '',
  description: '',
};

const toLatinDigits = (v) => v.replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
const onlyDigits = (v, max) => toLatinDigits(v).replace(/\D/g, '').slice(0, max);
const groupDigits = (v) => (v ? Number(v).toLocaleString('en-US') : '');

function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch {
    return '';
  }
}

function Field({ label, optional, error, children, hint }) {
  return (
    <div className={error ? 'sub-field has-error' : 'sub-field'}>
      <span className="sub-field__label">
        {label}
        {optional ? <span className="sub-field__opt"> (اختياري)</span> : null}
      </span>
      {children}
      {hint ? <span className="sub-field__hint">{hint}</span> : null}
      {error ? (
        <span className="sub-field__error" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

export default function SubmitForm({ cities, districtsByCity, whatsappNumber }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(() => ({ ...EMPTY, city: cities[0] ?? '' }));
  const [errors, setErrors] = useState({});
  const [images, setImages] = useState([]); // { full, thumb, preview }
  const [processing, setProcessing] = useState(0);
  const [consent, setConsent] = useState(false);
  const [website, setWebsite] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(null); // null | { done, total } | 'saving'
  const [sent, setSent] = useState(false);
  const startedAt = useRef(0);
  const topRef = useRef(null);
  const fileRef = useRef(null);
  const draftLoaded = useRef(false);

  // نرجّع المسودة لو العميل طلع بالغلط
  useEffect(() => {
    startedAt.current = Date.now();
    try {
      const saved = JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null');
      if (saved && typeof saved === 'object') {
        setForm((f) => {
          const next = { ...f };
          for (const k of Object.keys(EMPTY)) if (typeof saved[k] === 'string') next[k] = saved[k];
          if (!cities.includes(next.city)) next.city = cities[0] ?? '';
          if (!TYPES.includes(next.type)) next.type = 'villa';
          return next;
        });
      }
    } catch {
      // ما فيه مسودة
    }
    draftLoaded.current = true;
  }, [cities]);

  useEffect(() => {
    if (!draftLoaded.current || sent) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
      } catch {
        // التخزين ممتلئ أو مقفل
      }
    }, 400);
    return () => clearTimeout(t);
  }, [form, sent]);

  useEffect(() => () => images.forEach((img) => URL.revokeObjectURL(img.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, transform) => (e) => {
    const raw = typeof e === 'string' ? e : e.target.value;
    const value = transform ? transform(raw) : raw;
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const validate = (s) => {
    const er = {};
    if (s === 0) {
      if (form.name.trim().length < 2) er.name = 'اكتب اسمك';
      if (!/^05\d{8}$/.test(form.phone)) er.phone = 'رقم الجوال لازم يبدأ بـ05 ومن 10 أرقام';
    }
    if (s === 1) {
      if (form.type === 'other' && !form.customType.trim()) er.customType = 'اكتب نوع العقار';
      if (!form.city) er.city = 'اختر المدينة';
      if (form.district.trim().length < 2) er.district = 'اكتب اسم الحي';
      if (!(Number(form.area) > 0)) er.area = 'اكتب المساحة';
    }
    if (s === 2 && !consent) er.consent = 'لازم توافق عشان نقدر نستلم الطلب';
    setErrors(er);
    return Object.keys(er).length === 0;
  };

  const next = () => {
    setMessage('');
    if (!validate(step)) return;
    setStep((s) => s + 1);
    scrollTop();
  };
  const back = () => {
    setMessage('');
    setErrors({});
    setStep((s) => s - 1);
    scrollTop();
  };

  const onFiles = async (e) => {
    const files = [...(e.target.files ?? [])].slice(0, Math.max(0, MAX_IMAGES - images.length));
    e.target.value = '';
    if (!files.length) return;
    setMessage('');
    setProcessing((n) => n + files.length);
    for (const file of files) {
      try {
        const { full, thumb, previewUrl, fullUrl } = await processImage(file, SITE.shortName);
        URL.revokeObjectURL(fullUrl);
        setImages((list) => (list.length >= MAX_IMAGES ? list : [...list, { full, thumb, preview: previewUrl }]));
      } catch {
        setMessage('ما قدرنا نقرأ إحدى الصور، جرّب صورة ثانية');
      } finally {
        setProcessing((n) => n - 1);
      }
    }
  };

  const removeImage = (i) => {
    setImages((list) => {
      URL.revokeObjectURL(list[i]?.preview);
      return list.filter((_, j) => j !== i);
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (step < 2) {
      next();
      return;
    }
    if (!validate(2) || sending || processing) return;
    setMessage('');

    const uploaded = [];
    try {
      for (let i = 0; i < images.length; i++) {
        setSending({ done: i, total: images.length });
        const fd = new FormData();
        fd.append('full', images[i].full);
        fd.append('thumb', images[i].thumb);
        const result = await uploadSubmissionImage(fd);
        if (!result?.ok) throw new Error(result?.message);
        uploaded.push(result.image);
      }
      setSending('saving');
      const result = await submitProperty({
        ...form,
        images: uploaded,
        consent,
        website,
        deviceId: deviceId(),
        elapsed: Date.now() - startedAt.current,
      });
      if (!result?.ok) {
        setSending(null);
        setMessage(result?.message ?? 'صار خطأ، جرّب مرة ثانية');
        if (result?.errors) {
          setErrors(result.errors);
          if (result.errors.name || result.errors.phone) setStep(0);
          else if (!result.errors.consent) setStep(1);
        }
        scrollTop();
        return;
      }
    } catch (err) {
      setSending(null);
      setMessage(err?.message || 'ما قدرنا نرفع الصور، جرّب مرة ثانية');
      return;
    }
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      // ما يهم
    }
    setSending(null);
    setSent(true);
    scrollTop();
  };

  if (sent) {
    return (
      <div className="sub-done" ref={topRef}>
        <span className="sub-done__icon" aria-hidden="true">
          ✓
        </span>
        <h1>وصل طلبك</h1>
        <p>بنراجع بيانات عقارك ونتواصل معك قريب على رقمك.</p>
        {whatsappNumber ? (
          <a
            className="btn btn--wa"
            href={whatsappLink(whatsappNumber, `السلام عليكم، أرسلت طلب لعرض عقاري (${form.district ? `حي ${form.district}` : ''})`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ChatIcon />
            <span>تواصل على واتساب</span>
          </a>
        ) : null}
        <Link href="/" className="link-btn">
          الرجوع للعروض
        </Link>
      </div>
    );
  }

  const type = form.type;
  const isLand = type === 'land';
  const isApartment = type === 'apartment';
  const busy = Boolean(sending) || processing > 0;
  const suggestions = districtsByCity[form.city] ?? [];

  return (
    <form className="sub-form" onSubmit={onSubmit} noValidate ref={topRef}>
      <div className="sub-progress" aria-hidden="true">
        {STEPS.map((s, i) => (
          <span key={s} className={i <= step ? 'is-done' : undefined} />
        ))}
      </div>
      <p className="sub-step tabular">
        الخطوة {step + 1} من {STEPS.length}
      </p>
      <h2 className="sub-title">{STEPS[step]}</h2>

      {/* فخ للبرامج الآلية: مخفي عن الناس */}
      <label className="sub-trap" aria-hidden="true">
        موقعك
        <input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
      </label>

      {step === 0 ? (
        <div className="sub-card">
          <Field label="اسمك" error={errors.name}>
            <input
              className="sub-input"
              value={form.name}
              onChange={set('name')}
              placeholder="محمد ****"
              autoComplete="name"
              maxLength={60}
              enterKeyHint="next"
            />
          </Field>
          <Field label="رقم جوالك" error={errors.phone} hint="🔒 بياناتك ما تظهر لأحد">
            <input
              className="sub-input tabular"
              value={form.phone}
              onChange={set('phone', (v) => onlyDigits(v, 10))}
              placeholder="05********"
              inputMode="tel"
              autoComplete="tel"
              dir="ltr"
              enterKeyHint="next"
            />
          </Field>
        </div>
      ) : null}

      {step === 1 ? (
        <div className="sub-card">
          <Field label="نوع العقار" error={errors.type}>
            <div className="chips" role="radiogroup" aria-label="نوع العقار">
              {TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={type === t}
                  className={type === t ? 'pill pill--round is-active' : 'pill pill--round'}
                  onClick={() => set('type')(t)}
                >
                  {TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </Field>

          {type === 'other' ? (
            <Field label="اكتب النوع" error={errors.customType}>
              <SuggestInput
                value={form.customType}
                onChange={set('customType')}
                suggestions={CUSTOM_TYPE_OPTIONS}
                placeholder="عمارة ***"
                error={errors.customType}
              />
            </Field>
          ) : null}

          <div className="sub-row">
            <Field label="المدينة" error={errors.city}>
              <div className="field field--select">
                <select value={form.city} onChange={set('city')} aria-label="المدينة">
                  {cities.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="field__chevron" />
              </div>
            </Field>
            <Field label="الحي" error={errors.district} hint="اختر من الاقتراحات، أو اكتب حيك لو ما لقيته">
              <SuggestInput
                value={form.district}
                onChange={set('district')}
                suggestions={suggestions}
                placeholder="النرجس ***"
                error={errors.district}
              />
            </Field>
          </div>

          <div className="sub-row">
            <Field label="المساحة (م²)" error={errors.area}>
              <input
                className="sub-input tabular"
                value={groupDigits(form.area)}
                onChange={set('area', (v) => onlyDigits(v, 9))}
                placeholder="450 ***"
                inputMode="numeric"
              />
            </Field>
            <Field label="السعر (ريال)" optional>
              <input
                className="sub-input tabular"
                value={groupDigits(form.price)}
                onChange={set('price', (v) => onlyDigits(v, 12))}
                placeholder="2500***"
                inputMode="numeric"
              />
            </Field>
          </div>

          {!isLand ? (
            <div className="sub-row">
              <Field label="الغرف" optional>
                <input
                  className="sub-input tabular"
                  value={form.rooms}
                  onChange={set('rooms', (v) => onlyDigits(v, 3))}
                  placeholder="5 *"
                  inputMode="numeric"
                />
              </Field>
              <Field label="دورات المياه" optional>
                <input
                  className="sub-input tabular"
                  value={form.bathrooms}
                  onChange={set('bathrooms', (v) => onlyDigits(v, 3))}
                  placeholder="4 *"
                  inputMode="numeric"
                />
              </Field>
            </div>
          ) : null}

          <div className="sub-row">
            {!isLand ? (
              <Field label="عمر العقار" optional>
                <div className="field field--select">
                  <select value={form.ageYears} onChange={set('ageYears')} aria-label="عمر العقار">
                    <option value="">5 ** سنوات</option>
                    {AGE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="field__chevron" />
                </div>
              </Field>
            ) : null}
            {isApartment ? (
              <Field label="الدور" optional>
                <div className="field field--select">
                  <select value={form.floor} onChange={set('floor')} aria-label="الدور">
                    <option value="">الأول ***</option>
                    {FLOOR_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="field__chevron" />
                </div>
              </Field>
            ) : (
              <Field label="عرض الشارع (م)" optional>
                <input
                  className="sub-input tabular"
                  value={form.streetWidth}
                  onChange={set('streetWidth', (v) => onlyDigits(v, 3))}
                  placeholder="20 ** م"
                  inputMode="numeric"
                />
              </Field>
            )}
          </div>

          <Field label="الواجهة" optional>
            <div className="field field--select">
              <select value={form.facade} onChange={set('facade')} aria-label="الواجهة">
                <option value="">شمالية ***</option>
                {FACADE_OPTIONS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
              <ChevronDownIcon className="field__chevron" />
            </div>
          </Field>

          <Field label="رقم الصك" optional hint="يساعدنا نجهز عقد الوساطة بسرعة">
            <input
              className="sub-input tabular"
              value={form.deed}
              onChange={set('deed', (v) => onlyDigits(v, 20))}
              placeholder="3101********"
              inputMode="numeric"
              dir="ltr"
            />
          </Field>

          <Field label="وصف العقار" optional>
            <textarea
              className="sub-input sub-textarea"
              value={form.description}
              onChange={set('description')}
              placeholder="فيلا درج داخلي مع ملحق *** "
              maxLength={1000}
              rows={4}
            />
          </Field>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="sub-card">
          <Field label={`صور العقار (${images.length} من ${MAX_IMAGES})`} optional>
            <div className="sub-images">
              {images.map((img, i) => (
                <div key={img.preview} className="sub-images__item">
                  <img src={img.preview} alt={`صورة ${i + 1}`} />
                  <button type="button" onClick={() => removeImage(i)} aria-label={`حذف الصورة ${i + 1}`} disabled={busy}>
                    <CloseIcon />
                  </button>
                </div>
              ))}
              {Array.from({ length: processing }, (_, i) => (
                <div key={`p${i}`} className="sub-images__item sub-images__item--loading" aria-label="جاري تجهيز الصورة" />
              ))}
              {images.length + processing < MAX_IMAGES ? (
                <button type="button" className="sub-images__add" onClick={() => fileRef.current?.click()} disabled={Boolean(sending)}>
                  <span aria-hidden="true">+</span>
                  أضف صور
                </button>
              ) : null}
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onFiles} />
          </Field>

          <label className={errors.consent ? 'sub-consent has-error' : 'sub-consent'}>
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => {
                setConsent(e.target.checked);
                if (errors.consent) setErrors((er) => ({ ...er, consent: undefined }));
              }}
            />
            <span>أوافق موافقة مبدئية على عقد وساطة مع {SITE.name} لتسويق عقاري، وأقرّ بصحة البيانات</span>
          </label>
          {errors.consent ? (
            <p className="sub-field__error" role="alert">
              {errors.consent}
            </p>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <p className="sub-message" role="alert">
          {message}
        </p>
      ) : null}

      <div className="sub-nav">
        {step > 0 ? (
          <button type="button" className="btn btn--outline" onClick={back} disabled={Boolean(sending)}>
            رجوع
          </button>
        ) : null}
        <button type="submit" className="btn btn--primary" disabled={busy}>
          {sending === 'saving'
            ? 'جاري الإرسال…'
            : sending
              ? `جاري رفع الصور ${sending.done + 1} من ${sending.total}`
              : processing
                ? 'انتظر تجهيز الصور…'
                : step < 2
                  ? 'التالي'
                  : 'إرسال الطلب'}
        </button>
      </div>
    </form>
  );
}
