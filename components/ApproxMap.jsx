'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CloseIcon, ExpandIcon } from '@/components/Icons';
import { CITY_GEO, MAP_STYLE, districtFeature, districtKey, loadCityShapes, loadMapLibre, ringsBounds } from '@/lib/geo';

const PRIMARY = '#0f5c4d';

// الموقع التقريبي: حدود الحي بس (بدون نقطة دقيقة) + العروض المشابهة
export default function ApproxMap({ city, district, similar }) {
  const router = useRouter();
  const sectionRef = useRef(null);
  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const boundsRef = useRef(null);
  const [visible, setVisible] = useState(false);
  const [status, setStatus] = useState(CITY_GEO[city] ? 'loading' : 'none'); // loading | ready | none | error
  const [expanded, setExpanded] = useState(false);

  // ما نحمّل الخريطة إلا لما يوصل لها العميل
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || status === 'none') return undefined;
    if (!('IntersectionObserver' in window)) {
      setVisible(true);
      return undefined;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: '300px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [status]);

  useEffect(() => {
    if (!visible) return undefined;
    let alive = true;
    let failTimer = null;
    Promise.all([loadMapLibre(), loadCityShapes(city)])
      .then(([lib, shapes]) => {
        if (!alive || !boxRef.current) return;
        const shape = shapes.get(districtKey(district));
        if (!shape) {
          setStatus('none');
          return;
        }
        const bounds = ringsBounds([shape.rings]);
        boundsRef.current = bounds;
        const map = new lib.Map({
          container: boxRef.current,
          style: MAP_STYLE,
          bounds,
          fitBoundsOptions: { padding: 28, maxZoom: 14 },
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        setInteractive(map, false);
        map.on('load', () => {
          map.addSource('district', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [districtFeature(0, shape, {})] },
          });
          map.addLayer({ id: 'fill', type: 'fill', source: 'district', paint: { 'fill-color': PRIMARY, 'fill-opacity': 0.22 } });
          map.addLayer({ id: 'line', type: 'line', source: 'district', paint: { 'line-color': PRIMARY, 'line-width': 2.5 } });

          // العروض المشابهة على أحيائها (لو بنفس الحي نبعدها شوي عن بعض)
          const used = new Map();
          for (const s of similar) {
            const sh = shapes.get(districtKey(s.district));
            if (!sh) continue;
            const n = used.get(sh.name) ?? 0;
            used.set(sh.name, n + 1);
            const [lng, lat] = sh.center;
            const offset = sh.name === shape.name ? 0.004 * (n + 1) : 0.003 * n;
            const el = document.createElement('a');
            el.href = `/offers/${s.id}`;
            el.className = 'map-price';
            el.textContent = s.label;
            el.setAttribute('aria-label', `عرض مشابه في حي ${sh.name}: ${s.label}`);
            el.addEventListener('click', (ev) => {
              ev.preventDefault();
              ev.stopPropagation();
              router.push(`/offers/${s.id}`);
            });
            new lib.Marker({ element: el }).setLngLat([lng + offset, lat]).addTo(map);
          }
          setStatus('ready');
        });
        failTimer = setTimeout(() => {
          if (alive && !map.loaded()) setStatus('error');
        }, 20000);
        mapRef.current = map;
      })
      .catch(() => alive && setStatus('error'));
    return () => {
      alive = false;
      clearTimeout(failTimer);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [visible, city, district, similar, router]);

  // تكبير وتصغير
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return undefined;
    setInteractive(map, expanded);
    map.resize();
    if (boundsRef.current) {
      map.fitBounds(boundsRef.current, { padding: expanded ? 60 : 28, maxZoom: expanded ? 13 : 14, duration: 0 });
    }
    if (!expanded) return undefined;
    const onKey = (e) => e.key === 'Escape' && setExpanded(false);
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [expanded]);

  if (status === 'none') return null;

  return (
    <section ref={sectionRef} className="panel approx" aria-labelledby="approx-title">
      <h2 id="approx-title">الموقع التقريبي</h2>
      <div className={expanded ? 'approx__map is-expanded' : 'approx__map'}>
        <div ref={boxRef} className="approx__canvas" role="region" aria-label={`حدود حي ${district}`} />
        {status === 'loading' ? <div className="map-status">جاري تحميل الخريطة…</div> : null}
        {status === 'error' ? <div className="map-status">تعذّر تحميل الخريطة</div> : null}
        {status === 'ready' && !expanded ? (
          <button type="button" className="approx__open" onClick={() => setExpanded(true)} aria-label="تكبير الخريطة">
            <span className="approx__open-badge">
              <ExpandIcon className="icon-sm" />
              <span>تكبير</span>
            </span>
          </button>
        ) : null}
        {expanded ? (
          <>
            <div className="approx__bar">
              <span>
                حي {district}
                {similar.length ? <span className="approx__bar-sub"> · الأسعار = عروض مشابهة</span> : null}
              </span>
              <button type="button" className="icon-btn" aria-label="تصغير الخريطة" onClick={() => setExpanded(false)}>
                <CloseIcon />
              </button>
            </div>
          </>
        ) : null}
      </div>
      <p className="approx__note">الموقع الدقيق يُرسل لك عند التواصل</p>
    </section>
  );
}

function setInteractive(map, on) {
  const handlers = [map.dragPan, map.scrollZoom, map.boxZoom, map.doubleClickZoom, map.touchZoomRotate, map.keyboard];
  for (const h of handlers) {
    if (!h) continue;
    if (on) h.enable();
    else h.disable();
  }
  if (on) map.touchZoomRotate.disableRotation();
}
