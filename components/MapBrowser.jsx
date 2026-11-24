'use client';

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import MiniOfferCard from '@/components/MiniOfferCard';
import { ChatIcon, CloseIcon, SearchIcon, SlidersIcon } from '@/components/Icons';
import { filterOffers } from '@/lib/filter';
import { DIRECTIONS, TYPE_FILTERS, formatNumber, normalizeArabic, requestMessage, whatsappLink } from '@/lib/format';
import { CITY_GEO, MAP_STYLE, districtFeature, districtKey, loadCityShapes, loadMapLibre, ringsBounds } from '@/lib/geo';

const PRIMARY = '#0f5c4d';
const HINT_KEY = 'mz_map_hint';
const EMPTY = { type: 'FeatureCollection', features: [] };
const BOTTOM_TABS = 84;

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
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const topRef = useRef(null);
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

  const topSpace = () => (topRef.current?.offsetHeight ?? 150) + 24;

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
        map.on('load', () => {
          map.addSource('all', { type: 'geojson', data: EMPTY });
          map.addSource('all-names', { type: 'geojson', data: EMPTY });
          map.addSource('offer-names', { type: 'geojson', data: EMPTY });
          // أسماء الأحياء من الخريطة الأساسية تتكرر مع أسمائنا، فنخفيها
          if (map.getLayer('label_other')) map.setLayoutProperty('label_other', 'visibility', 'none');
          map.addSource('districts', { type: 'geojson', data: EMPTY });
          // كل الأحياء: حدود رمادية خفيفة وتنضغط
          map.addLayer({
            id: 'a-fill',
            type: 'fill',
            source: 'all',
            paint: { 'fill-color': '#8a8676', 'fill-opacity': 0.06 },
          });
          map.addLayer({
            id: 'a-line',
            type: 'line',
            source: 'all',
            paint: { 'line-color': '#8a8676', 'line-width': 0.8, 'line-opacity': 0.55 },
          });
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
          map.addLayer({
            id: 'a-names',
            type: 'symbol',
            source: 'all-names',
            minzoom: 11.5,
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Regular'],
              'text-size': 12,
              'text-max-width': 8,
            },
            paint: { 'text-color': '#4a4a44', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 },
          });
          // أسماء الأحياء اللي فيها عروض: تطلع دايم تحت الرقم
          map.addLayer({
            id: 'o-names',
            type: 'symbol',
            source: 'offer-names',
            layout: {
              'text-field': ['get', 'name'],
              'text-font': ['Noto Sans Bold'],
              'text-size': 13,
              'text-max-width': 8,
              'text-anchor': 'top',
              'text-offset': [0, 1.5],
            },
            paint: { 'text-color': PRIMARY, 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
          });
          map.on('click', 'a-fill', (e) => {
            const key = e.features?.[0]?.properties?.key;
            if (key) setSelected(key);
          });
          map.on('mouseenter', 'a-fill', () => {
            map.getCanvas().style.cursor = 'pointer';
          });
          map.on('mouseleave', 'a-fill', () => {
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

  // كل أحياء المدينة (تنضغط حتى لو ما فيها عروض)
  useEffect(() => {
    const map = mapRef.current;
    if (mapState !== 'ready' || !map) return;
    if (!shapes) {
      map.getSource('all')?.setData(EMPTY);
      map.getSource('all-names')?.setData(EMPTY);
      return;
    }
    const polys = [];
    const names = [];
    let i = 0;
    for (const [key, shape] of shapes) {
      polys.push(districtFeature(i, shape, { key }));
      names.push({ type: 'Feature', id: i, properties: { name: shape.name }, geometry: { type: 'Point', coordinates: shape.center } });
      i += 1;
    }
    map.getSource('all')?.setData({ type: 'FeatureCollection', features: polys });
    map.getSource('all-names')?.setData({ type: 'FeatureCollection', features: names });
  }, [mapState, shapes]);

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
    map.getSource('offer-names')?.setData({
      type: 'FeatureCollection',
      features: features.map((f) => ({
        type: 'Feature',
        id: f.id,
        properties: { name: f.properties.name },
        geometry: { type: 'Point', coordinates: shapes.get(f.properties.key).center },
      })),
    });

    // أول ما تتغير المدينة: نوسّط الخريطة عليها
    if (fittedCityRef.current !== city) {
      fittedCityRef.current = city;
      const withOffers = features.length ? features.map((f) => shapes.get(f.properties.key).rings) : [...shapes.values()].map((s) => s.rings);
      const b = ringsBounds(withOffers);
      if (b) map.fitBounds(b, { padding: { top: topSpace(), bottom: BOTTOM_TABS + 30, left: 20, right: 20 }, maxZoom: 13, duration: 0 });
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
    if (b) map.fitBounds(b, { padding: { top: topSpace(), left: 30, right: 30, bottom: BOTTOM_TABS + 230 }, maxZoom: 14.5, duration: 600 });
  }, [mapState, selectedShape]);

  const selectedOffers = selected ? byDistrict.get(selected) ?? [] : [];
  const districtsWithOffers = shapes ? [...byDistrict.keys()].filter((k) => shapes.has(k)).length : 0;

  const advancedCount = [direction, budget].filter(Boolean).length;
  const onBudgetChange = (e) => {
    const d = e.target.value.replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, (x) => '٠١٢٣٤٥٦٧٨٩'.indexOf(x));
    setBudget(d.slice(0, 10));
  };

  return (
    <div className="map-full">
      <div ref={boxRef} className="map-canvas" role="region" aria-label={`خريطة أحياء ${city}`} />

      <div ref={topRef} className="map-float">
        <div className="map-search">
          <label className="map-search__field">
            <SearchIcon className="map-search__icon" />
            <span className="sr-only">ابحث باسم الحي أو المدينة</span>
            <input
              type="search"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="ابحث باسم الحي أو المدينة…"
              autoComplete="off"
              enterKeyHint="search"
              spellCheck={false}
            />
          </label>
          <button
            type="button"
            className={advancedOpen || advancedCount ? 'map-search__adv is-active' : 'map-search__adv'}
            aria-expanded={advancedOpen}
            aria-label="بحث متقدم"
            onClick={() => setAdvancedOpen((v) => !v)}
          >
            <SlidersIcon />
            {advancedCount ? <span className="map-search__badge tabular">{advancedCount}</span> : null}
          </button>
        </div>

        {mapCities.length > 1 ? (
          <div className="map-chips" role="group" aria-label="المدينة">
            {mapCities.map((c) => (
              <button
                key={c}
                type="button"
                className={c === city ? 'map-chip map-chip--city is-active' : 'map-chip map-chip--city'}
                aria-pressed={c === city}
                onClick={() => pickCity(c)}
              >
                {c}
              </button>
            ))}
          </div>
        ) : null}

        <div className="map-chips" role="group" aria-label="نوع العقار">
          {TYPE_FILTERS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={type === t.key ? 'map-chip is-active' : 'map-chip'}
              aria-pressed={type === t.key}
              onClick={() => setType(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {advancedOpen ? (
          <div className="map-adv">
            <p className="map-adv__label">موقع الحي</p>
            <div className="chips chips--grid">
              {DIRECTIONS.map((d) => {
                const active = direction === d.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    className={active ? 'pill pill--soft is-active' : 'pill pill--soft'}
                    aria-pressed={active}
                    onClick={() => setDirection(active ? null : d.key)}
                  >
                    {d.label}
                  </button>
                );
              })}
            </div>
            <label className="field map-adv__budget">
              <span className="sr-only">ميزانيتك القصوى بالريال</span>
              <input
                type="text"
                inputMode="numeric"
                value={budget ? formatNumber(Number(budget)) : ''}
                onChange={onBudgetChange}
                placeholder="ميزانيتك (ريال)"
                autoComplete="off"
                className="tabular"
              />
            </label>
            <div className="map-adv__actions">
              {advancedCount ? (
                <button
                  type="button"
                  className="btn btn--outline"
                  onClick={() => {
                    setDirection(null);
                    setBudget('');
                  }}
                >
                  مسح
                </button>
              ) : null}
              <button type="button" className="btn btn--primary" onClick={() => setAdvancedOpen(false)}>
                تم
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {mapState === 'loading' ? <div className="map-status">جاري تحميل الخريطة…</div> : null}
      {mapState === 'error' ? (
        <div className="map-status">
          <p>تعذّر تحميل الخريطة، تأكد من الإنترنت.</p>
          <button type="button" className="btn btn--outline" onClick={() => window.location.reload()}>
            إعادة المحاولة
          </button>
        </div>
      ) : null}

      {mapState === 'ready' && !selected ? (
        showHint ? (
          <div className="map-hint" role="status">
            <span>الأحياء الخضراء فيها عروض، واضغط على أي حي عشان تشوف عروضه</span>
            <button type="button" className="map-hint__ok" onClick={closeHint}>
              تمام
            </button>
          </div>
        ) : (
          <p className="map-summary tabular" aria-live="polite">
            {districtsWithOffers ? `${districtsWithOffers} ${districtsWithOffers <= 10 ? 'أحياء' : 'حي'} فيها عروض` : 'ما فيه عروض تطابق بحثك هنا'}
          </p>
        )
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
  );
}
