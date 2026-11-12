'use client';

import { useId, useMemo, useState } from 'react';
import { normalizeArabic } from '@/lib/format';

const MAX_SUGGESTIONS = 8;

// خانة كتابة حرّة مع اقتراحات (الاقتراح مو إجباري)
export default function SuggestInput({ id, value, onChange, suggestions, placeholder, error }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const matches = useMemo(() => {
    const q = normalizeArabic(value.trim());
    const pool = [...new Set(suggestions.filter(Boolean))];
    if (!q) return pool.slice(0, MAX_SUGGESTIONS);
    const starts = [];
    const contains = [];
    for (const s of pool) {
      const n = normalizeArabic(s);
      if (n === q) continue;
      if (n.startsWith(q)) starts.push(s);
      else if (n.includes(q)) contains.push(s);
    }
    return [...starts, ...contains].slice(0, MAX_SUGGESTIONS);
  }, [suggestions, value]);

  const choose = (s) => {
    onChange(s);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Enter') {
      if (open && active >= 0 && matches[active]) {
        e.preventDefault();
        choose(matches[active]);
      }
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  const showList = open && matches.length > 0;

  return (
    <div className={error ? 'combo has-error' : 'combo'}>
      <div className="field">
        <input
          id={id}
          type="text"
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList && active >= 0 ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="done"
          maxLength={40}
          placeholder={placeholder}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setActive(-1);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
        />
      </div>
      {showList ? (
        <ul className="combo__list" id={listId} role="listbox">
          {matches.map((s, i) => (
            <li
              key={s}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={i === active ? 'is-active' : undefined}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => choose(s)}
            >
              <span>{s}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
