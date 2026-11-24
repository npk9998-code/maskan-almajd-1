'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import MiniOfferCard from '@/components/MiniOfferCard';
import SearchFilters from '@/components/SearchFilters';
import { ChatIcon, CloseIcon } from '@/components/Icons';
import { filterOffers } from '@/lib/filter';
import { normalizeArabic, requestMessage, whatsappLink } from '@/lib/format';
import { CITY_GEO, MAP_STYLE, districtFeature, districtKey, loadCityShapes, loadMapLibre, ringsBounds } from '@/lib/geo';

const PRIMARY = '#0f5c4d';
const HINT_KEY = 'mz_map_hint';
const EMPTY = { type: 'FeatureCollection', features: [] };

function countLabel(n) {
  if (n === 0) return 'ما فيه عروض';
  if (n === 1) return 'عرض واحد';
  if (n === 2) return 'عرضين';
  return `${n} ${n <= 10 ? 'عروض' : 'عرض'}`;
}

export default function MapBrowser({ offers, cities, whatsappNumber }) {
  const mapCities = useMemo(() => cities.filter((c) => CITY_GEO[c]), [cities]);
  const firstCity = useMemo(() => {
    const counts = new Map();
    for (const o of offers) counts.set(o.city, (counts.get(o.city) ?? 0) + 1);
    return mapCities.find((c) => counts.get(c)) ?? mapCities[0] ?? '';
  }, [offers, mapCities]);

  const [query, setQuery] = useState('');
  const [type, setType] = useState('all');
  const [direction, setDirection] = useState(null);
  const [budget, setBudget] = useState('');
  const [city, setCity] = useState(firstCity);
  const [selected, setSelected] = useState(null);
  const [shapes, setShapes] = useState(null);
  const [mapState, setMapState] = useState('loading'); // loading | ready | error
  const [showHint, setShowHint] = useState(false);
  const deferredQuery = useDeferredValue(query);

  const boxRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const fittedCityRef = useRef(null);

  useEffect(() => {
    try {
      if (!localStorage.getItem(HINT_KEY)) setShowHint(true);
    } catch {
      // التخزين مقفل
    }
  }, []);
  const closeHint = () => {
    setShowHint(false);
    try {
      localStorage.setItem(HINT_KEY, '1');
    } catch {
      // ما يهم
    }
  };

  // كتابة اسم مدينة في البحث تنقل الخريطة لها
  const onQuery = (value) => {
    const q = normalizeArabic(value);
    const match = q.length >= 3 ? mapCities.find((c) => normalizeArabic(c) === q) : null;
    if (match) {
      setCity(match);
      setSelected(null);
      setQuery('');
      return;
    }
    setQuery(value);
  };

  const pickCity = (c) => {
    setCity(c);
    setSelected(null);
  };

  // حدود أحياء المدينة
  useEffect(() => {
    let alive = true;
    setShapes(null);
    if (!city) return undefined;
    loadCityShapes(city).then((m) => alive && setShapes(m));
    return () => {
      alive = false;
    };
  }, [city]);

  const cityOffers = useMemo(
    () => filterOffers(offers, { query: deferredQuery, type, direction, budget, city }),
    [offers, deferredQuery, type, direction, budget, city],
  );

  // العروض لكل حي
  const byDistrict = useMemo(() => {
    const m = new Map();
    for (const o of cityOffers) {
      const k = districtKey(o.district);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(o);
    }
    return m;
  }, [cityOffers]);

  // البحث باسم حي يحدده مباشرة
  useEffect(() => {
    const q = normalizeArabic(deferredQuery);
    if (!q || !shapes) return;
    if (shapes.has(q)) {
      setSelected(q);
      return;
    }
    const keys = [...byDistrict.keys()].filter((k) => shapes.has(k));
    if (keys.length === 1) setSelected(keys[0]);
  }, [deferredQuery, shapes, byDistrict]);

  // تجهيز الخريطة مرة وحدة
  useEffect(() => {
    let alive = true;
    let failTimer = null;
    loadMapLibre()
      .then((lib) => {
        if (!alive || !boxRef.current) return;
        const map = new lib.Map({
          container: boxRef.current,
          style: MAP_STYLE,
          center: [46.68, 24.71],
          zoom: 9.5,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        });
        map.touchZoomRotate.disableRotation();
        map.addControl(new lib.NavigationControl({ showCompass: false }), 'top-left');
        map.on('load', () => {
          map.addSource('districts', { type: 'geojson', data: EMPTY });
          map.addSource('selected', { type: 'geojson', data: EMPTY });
          map.addLayer({
            id: 'd-fill',
            type: 'fill',
            source: 'districts',
            paint: { 'fill-color': PRIMARY, 'fill-opacity': 0.14 },
          });
          map.addLayer({
            id: 'd-line',
            type: 'line',
            source: 'districts',
            paint: { 'line-color': PRIMARY, 'line-width': 1.2, 'line-opacity': 0.7 },
          });
          map.addLayer({
            id: 's-fill',
            type: 'fill',
            source: 'selected',
            paint: { 'fill-color': PRIMARY, 'fill-opacity': 0.3 },
          });
          map.addLayer({
            id: 's-line',
            type: 'line',
            source: 'selected',
            paint: { 'line-color': PRIMARY, 'line-width': 3 },
          });
          map.on('click', 'd-fill', (e) => {
            const key = e.features?.[0]?.properties?.key;
            if (key) setSelected(key);
          });
          map.on('mouseenter', 'd-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'd-fill', () => {
            map.getCanvas().style.cursor = '';
          });
          mapRef.current = map;
          setMapState('ready');
        });
        // لو الخريطة ما فتحت خلال ٢٠ ثانية (نت ضعيف)
        failTimer = setTimeout(() => {
          if (alive && !mapRef.current) setMapState('error');
        }, 20000);
      })
      .catch(() => alive && setMapState('error'));
    return () => {
      alive = false;
      clearTimeout(failTimer);
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // رسم الأحياء اللي فيها عروض + أرقامها
  useEffect(() => {
    const map = mapRef.current;
    const lib = typeof window !== 'undefined' ? window.maplibregl : null;
    if (mapState !== 'ready' || !map || !lib || !shapes) return;
    const features = [];
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];
    let i = 0;
    for (const [key, list] of byDistrict) {
      const shape = shapes.get(key);
      if (!shape) continue;
      features.push(districtFeature(i++, shape, { key }));
      const el = document.createElement('button');
      el.type = 'button';
      el.className = key === selected ? 'map-count is-active' : 'map-count';
      el.textContent = String(list.length);
      el.setAttribute('aria-label', `حي ${shape.name}: ${countLabel(list.length)}`);
      el.addEventListener('click', (ev) => {
        ev.stopPropagation();
        setSelected(key);
      });
      markersRef.current.push(new lib.Marker({ element: el }).setLngLat(shape.center).addTo(map));
    }
    map.getSource('districts')?.setData({ type: 'FeatureCollection', features });

    // أول ما تتغير المدينة: نوسّط الخريطة عليها
    if (fittedCityRef.current !== city) {
      fittedCityRef.current = city;
      const withOffers = features.length ? features.map((f) => shapes.get(f.properties.key).rings) : [...shapes.values()].map((s) => s.rings);
      const b = ringsBounds(withOffers);
      if (b) map.fitBounds(b, { padding: 40, maxZoom: 13, duration: 0 });
    }
  }, [mapState, shapes, byDistrict, selected, city]);

  // الحي المحدد
  const selectedShape = selected && shapes ? shapes.get(selected) : null;
  useEffect(() => {
    const map = mapRef.current;
    if (mapState !== 'ready' || !map) return;
    if (!selectedShape) {
      map.getSource('selected')?.setData(EMPTY);
      return;
    }
    map.getSource('selected')?.setData({ type: 'FeatureCollection', features: [districtFeature(0, selectedShape, {})] });
    const b = ringsBounds([selectedShape.rings]);
    if (b) map.fitBounds(b, { padding: { top: 40, left: 40, right: 40, bottom: 200 }, maxZoom: 14.5, duration: 600 });
  }, [mapState, selectedShape]);

  const selectedOffers = selected ? byDistrict.get(selected) ?? [] : [];
  const districtsWithOffers = shapes ? [...byDistrict.keys()].filter((k) => shapes.has(k)).length : 0;

  return (
    <>
      <SearchFilters
        query={query}
        onQuery={onQuery}
        type={type}
        onType={setType}
        direction={direction}
        onDirection={setDirection}
        budget={budget}
        onBudget={setBudget}
        city={city}
        onCity={pickCity}
        placeholder="ابحث باسم الحي أو المدينة…"
      />

      {mapCities.length > 1 ? (
        <div className="chips map-cities" role="group" aria-label="المدينة">
          {mapCities.map((c) => {
            const active = c === city;
            return (
              <button
                key={c}
                type="button"
                className={active ? 'pill pill--round is-active' : 'pill pill--round'}
                aria-pressed={active}
                onClick={() => pickCity(c)}
              >
                {c}
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="map-shell">
        <div ref={boxRef} className="map-canvas" role="region" aria-label={`خريطة أحياء ${city}`} />

        {mapState === 'loading' ? <div className="map-status">جاري تحميل الخريطة…</div> : null}
        {mapState === 'error' ? (
          <div className="map-status">
            <p>تعذّر تحميل الخريطة، تأكد من الإنترنت.</p>
            <button type="button" className="btn btn--outline" onClick={() => window.location.reload()}>
              إعادة المحاولة
            </button>
          </div>
        ) : null}

        {showHint && mapState === 'ready' ? (
          <div className="map-hint" role="status">
            <span>اضغط على أي حي عشان تشوف عروضه</span>
            <button type="button" className="map-hint__ok" onClick={closeHint}>
              تمام
            </button>
          </div>
        ) : null}

        {mapState === 'ready' && !selected ? (
          <p className="map-summary tabular" aria-live="polite">
            {districtsWithOffers ? `${districtsWithOffers} ${districtsWithOffers <= 10 ? 'أحياء' : 'حي'} فيها عروض` : 'ما فيه عروض تطابق بحثك هنا'}
          </p>
        ) : null}

        {selected ? (
          <section className="map-sheet" aria-labelledby="map-sheet-title">
            <div className="map-sheet__head">
              <h2 id="map-sheet-title">
                حي {selectedShape?.name ?? selected} <span className="map-sheet__count tabular">· {countLabel(selectedOffers.length)}</span>
              </h2>
              <button type="button" className="icon-btn icon-btn--plain" aria-label="إغلاق" onClick={() => setSelected(null)}>
                <CloseIcon />
              </button>
            </div>
            {selectedOffers.length ? (
              <div className="map-sheet__list">
                {selectedOffers.map((o) => (
                  <MiniOfferCard key={o.id} offer={o} />
                ))}
              </div>
            ) : (
              <div className="map-sheet__empty">
                <p>ما فيه عروض في هذا الحي حالياً.</p>
                {whatsappNumber ? (
                  <a
                    className="btn btn--wa"
                    href={whatsappLink(whatsappNumber, requestMessage({ query: selectedShape?.name ?? '', direction, type, city, budget }))}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ChatIcon />
                    <span>اطلب عرض في هذا الحي</span>
                  </a>
                ) : null}
              </div>
            )}
          </section>
        ) : null}
      </div>
    </>
  );
}
