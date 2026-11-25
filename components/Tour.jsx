'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

const DONE_KEY = 'mz_tour_done';
export const TOUR_EVENT = 'mz-tour';

const STEPS = [
  { target: 'search', title: 'البحث', text: 'اكتب اسم الحي أو المدينة، وتطلع لك العروض على طول.' },
  { target: 'type', title: 'نوع العقار', text: 'اختر اللي تبغاه: فيلا، شقة، أرض…' },
  { target: 'advanced', title: 'بحث متقدم', text: 'حدد موقع الحي (شمال، جنوب…) والمدينة وميزانيتك.' },
  { target: 'favorites', title: 'المفضلة', text: 'اضغط القلب على أي عرض يعجبك، وتلقاه محفوظ هنا.' },
  { target: 'map-tab', title: 'الخريطة', text: 'شوف العروض على الخريطة حسب الأحياء.' },
  { target: 'whatsapp', title: 'تواصل معي', text: 'أي استفسار؟ كلمني مباشرة على واتساب.' },
  { target: 'submit', title: 'اعرض عقارك', text: 'عندك عقار تبي تبيعه؟ اضغط هنا وعبّ بياناته، ونتواصل معك.' },
];

const PAD = 6;

function findTarget(name) {
  const els = document.querySelectorAll(`[data-tour="${name}"]`);
  for (const el of els) {
    const r = el.getBoundingClientRect();
    if (r.width > 0 && r.height > 0) return el;
  }
  return null;
}

export default function Tour({ steps: allSteps = STEPS, storageKey = DONE_KEY, eventName = TOUR_EVENT }) {
  const [steps, setSteps] = useState(null); // الخطوات الموجودة فعلاً في الصفحة
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState(null);
  const nextRef = useRef(null);
  const cardRef = useRef(null);
  const [cardH, setCardH] = useState(160);

  const start = useCallback(() => {
    const available = allSteps.filter((s) => findTarget(s.target));
    if (!available.length) return;
    setSteps(available);
    setIndex(0);
  }, [allSteps]);

  const finish = useCallback(() => {
    setSteps(null);
    setRect(null);
    try {
      localStorage.setItem(storageKey, '1');
    } catch {
      // ما يهم
    }
  }, [storageKey]);

  // أول زيارة بس
  useEffect(() => {
    let seen = true;
    try {
      seen = Boolean(localStorage.getItem(storageKey));
    } catch {
      // التخزين مقفل: ما نعرضها
    }
    const t = seen ? null : setTimeout(start, 900);
    window.addEventListener(eventName, start);
    return () => {
      if (t) clearTimeout(t);
      window.removeEventListener(eventName, start);
    };
  }, [start, storageKey, eventName]);

  const step = steps?.[index];

  // نوصل للعنصر ونقيس مكانه
  useLayoutEffect(() => {
    if (!step) return undefined;
    const el = findTarget(step.target);
    if (!el) return undefined;
    if (el.closest('.site-header')) window.scrollTo({ top: 0, behavior: 'instant' });
    else if (!el.closest('.bottom-tabs, .admin-nav')) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const measure = () => setRect(el.getBoundingClientRect());
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
    };
  }, [step]);

  useLayoutEffect(() => {
    if (cardRef.current) setCardH(cardRef.current.offsetHeight);
    nextRef.current?.focus({ preventScroll: true });
  }, [step, rect]);

  useEffect(() => {
    if (!step) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') finish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [step, finish]);

  if (!step || !rect) return null;

  const last = index === steps.length - 1;
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const spaceBelow = vh - rect.bottom;
  const below = spaceBelow > cardH + 24 || spaceBelow > rect.top;
  const cardWidth = Math.min(340, vw - 24);
  const center = rect.left + rect.width / 2;
  const left = Math.min(Math.max(12, center - cardWidth / 2), vw - cardWidth - 12);
  const top = below ? rect.bottom + PAD + 12 : Math.max(12, rect.top - PAD - 12 - cardH);
  const arrowLeft = Math.min(Math.max(18, center - left), cardWidth - 18);

  return (
    <div className="tour" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-text">
      <div className="tour__backdrop" onClick={finish} />
      <div
        className="tour__spot"
        style={{
          top: rect.top - PAD,
          left: rect.left - PAD,
          width: rect.width + PAD * 2,
          height: rect.height + PAD * 2,
        }}
      />
      <div ref={cardRef} className={below ? 'tour__card' : 'tour__card is-above'} style={{ top, left, width: cardWidth }}>
        <span className="tour__arrow" style={{ left: arrowLeft }} aria-hidden="true" />
        <p className="tour__step tabular">
          {index + 1} / {steps.length}
        </p>
        <h2 id="tour-title" className="tour__title">
          {step.title}
        </h2>
        <p id="tour-text" className="tour__text">
          {step.text}
        </p>
        <div className="tour__foot">
          <div className="tour__dots" aria-hidden="true">
            {steps.map((s, i) => (
              <span key={s.target} className={i === index ? 'is-active' : undefined} />
            ))}
          </div>
          <div className="tour__actions">
            {last ? null : (
              <button type="button" className="tour__skip" onClick={finish}>
                تخطّي
              </button>
            )}
            <button
              ref={nextRef}
              type="button"
              className="btn btn--primary tour__next"
              onClick={() => (last ? finish() : setIndex((i) => i + 1))}
            >
              {last ? 'يلا نبدأ' : 'التالي'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TourReplayButton({ eventName = TOUR_EVENT, label = 'كيف أستخدم الموقع؟' }) {
  return (
    <button
      type="button"
      className="link-btn"
      onClick={() => {
        window.scrollTo({ top: 0, behavior: 'instant' });
        window.dispatchEvent(new Event(eventName));
      }}
    >
      {label}
    </button>
  );
}
