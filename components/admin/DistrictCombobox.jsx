'use client';

import { useId, useMemo, useRef, useState } from 'react';
import { normalizeArabic } from '@/lib/format';

const MAX_SUGGESTIONS = 8;

// خانة الحي: تكتب وتطلع لك الاقتراحات على طول
export default function DistrictCombobox({ districts, cities, cityId, districtId, onSelect, error }) {
  const listId = useId();
  const inputRef = useRef(null);
  const selected = districts.find((d) => String(d.id) === String(districtId));
  const [query, setQuery] = useState(selected?.name ?? '');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const cityName = useMemo(() => new Map(cities.map((c) => [String(c.id), c.name])), [cities]);

  // لو تغير الحي من برا (مثلاً تغيرت المدينة) نحدّث النص
  const [lastSelectedId, setLastSelectedId] = useState(districtId);
  if (lastSelectedId !== districtId) {
    setLastSelectedId(districtId);
    setQuery(selected?.name ?? '');
  }

  const suggestions = useMemo(() => {
    const pool = cityId ? districts.filter((d) => String(d.city_id) === String(cityId)) : districts;
    const q = normalizeArabic(query.trim());
    if (!q) return pool.slice(0, MAX_SUGGESTIONS);
    const starts = [];
    const contains = [];
    for (const d of pool) {
      const name = normalizeArabic(d.name);
      if (name.startsWith(q)) starts.push(d);
      else if (name.includes(q)) contains.push(d);
      if (starts.length >= MAX_SUGGESTIONS) break;
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [districts, cityId, query]);

  const choose = (d) => {
    setQuery(d.name);
    setOpen(false);
    onSelect(d);
    inputRef.current?.blur();
  };

  const onKeyDown = (e) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      setOpen(true);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && suggestions[active]) {
        e.preventDefault();
        choose(suggestions[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && (suggestions.length > 0 || query.trim());

  return (
    <div className={error ? 'combo has-error' : 'combo'}>
      <div className="field">
        <input
          ref={inputRef}
          id="f-district"
          type="text"
          role="combobox"
          aria-expanded={Boolean(showList)}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && suggestions[active] ? `${listId}-${suggestions[active].id}` : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          placeholder={cityId ? 'اكتب اسم الحي…' : 'اكتب اسم الحي (أي مدينة)…'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
            setOpen(true);
            if (districtId) onSelect(null);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />
      </div>
      {showList ? (
        <ul className="combo__list" id={listId} role="listbox">
          {suggestions.length ? (
            suggestions.map((d, i) => (
              <li
                key={d.id}
                id={`${listId}-${d.id}`}
                role="option"
                aria-selected={i === active}
                className={i === active ? 'is-active' : undefined}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(d)}
              >
                <span>{d.name}</span>
                {!cityId ? <small>{cityName.get(String(d.city_id))}</small> : null}
              </li>
            ))
          ) : (
            <li className="combo__empty" role="option" aria-disabled="true" aria-selected="false">
              ما لقيت حي بهالاسم
            </li>
          )}
        </ul>
      ) : null}
    </div>
  );
}
