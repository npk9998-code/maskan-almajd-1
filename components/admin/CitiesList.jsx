'use client';

import Link from 'next/link';
import { useOptimistic, useState, useTransition } from 'react';
import { setCityVisible } from '@/app/admin/city-actions';
import { ChevronIcon } from '@/components/Icons';

const offersText = (n) => (n === 0 ? 'بدون عروض' : n === 1 ? 'عرض واحد' : n === 2 ? 'عرضين' : n <= 10 ? `${n} عروض` : `${n} عرض`);

export function Switch({ checked, onChange, label, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={checked ? 'switch is-on' : 'switch'}
      onClick={() => onChange(!checked)}
      disabled={disabled}
    >
      <span className="switch__thumb" />
    </button>
  );
}

export default function CitiesList({ cities }) {
  const [error, setError] = useState('');
  const [, startTransition] = useTransition();
  const [list, applyOptimistic] = useOptimistic(cities, (state, { id, visible }) =>
    state.map((c) => (c.id === id ? { ...c, visible } : c)),
  );

  const toggle = (id, visible) => {
    setError('');
    startTransition(async () => {
      applyOptimistic({ id, visible });
      const result = await setCityVisible(id, visible);
      if (!result?.ok) setError(result?.message ?? 'صار خطأ');
    });
  };

  return (
    <>
      {error ? (
        <p className="admin-error" role="alert">
          {error}
        </p>
      ) : null}
      <ul className="city-list">
        {list.map((c) => (
          <li key={c.id}>
            <Link href={`/admin/cities/${c.id}`} className="city-list__info">
              <strong>{c.name}</strong>
              <span className="tabular">
                {c.visible ? 'ظاهرة للعملاء' : 'مخفية'} · {c.districtCount} حي
              </span>
              <span className="city-list__offers tabular">
                {offersText(c.offers.total)}
                {c.offers.total > 0 ? ` (${c.offers.available} معروض)` : ''}
              </span>
            </Link>
            <Switch
              checked={c.visible}
              onChange={(v) => toggle(c.id, v)}
              label={`${c.name}: ${c.visible ? 'ظاهرة' : 'مخفية'}`}
            />
            <Link href={`/admin/cities/${c.id}`} className="city-list__more" aria-label={`أحياء ${c.name}`}>
              <ChevronIcon style={{ rotate: '180deg' }} />
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}
