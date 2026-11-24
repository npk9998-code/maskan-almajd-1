'use client';

import { useId, useState } from 'react';
import { ChevronDownIcon, SearchIcon, SlidersIcon } from '@/components/Icons';
import { DIRECTIONS, TYPE_FILTERS, formatNumber } from '@/lib/format';

// صندوق البحث المشترك بين صفحة العروض وصفحة الخريطة
export default function SearchFilters({
  query,
  onQuery,
  type,
  onType,
  direction,
  onDirection,
  budget,
  onBudget,
  city,
  onCity,
  cities = null,
  placeholder = 'ابحث بالحي أو المدينة أو النوع…',
  className = 'filters',
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const advancedId = useId();
  const advancedCount = [direction, cities ? city : null, budget].filter(Boolean).length;
  const resetAdvanced = () => {
    onDirection(null);
    if (cities) onCity('');
    onBudget('');
  };
  const onBudgetChange = (e) => {
    const digits = e.target.value.replace(/[^\d٠-٩]/g, '').replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d));
    onBudget(digits.slice(0, 10));
  };

  return (
      <section className={className} aria-label="أدوات البحث">
        <label className="search" data-tour="search">
          <SearchIcon className="search__icon" />
          <span className="sr-only">ابحث بالحي أو المدينة</span>
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            enterKeyHint="search"
            spellCheck={false}
          />
        </label>

        <fieldset className="filter-group" data-tour="type">
          <legend>نوع العقار</legend>
          <div className="chips chips--types">
            {TYPE_FILTERS.map((t) => {
              const active = type === t.key;
              return (
                <button
                  key={t.key}
                  type="button"
                  className={active ? 'pill pill--round is-active' : 'pill pill--round'}
                  aria-pressed={active}
                  onClick={() => onType(t.key)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        <button
          type="button"
          className={advancedOpen ? 'advanced-toggle is-open' : 'advanced-toggle'}
          aria-expanded={advancedOpen}
          aria-controls={advancedId}
          onClick={() => setAdvancedOpen((v) => !v)}
          data-tour="advanced"
        >
          <SlidersIcon className="icon-sm" />
          <span>بحث متقدم</span>
          {advancedCount > 0 ? <span className="advanced-toggle__count tabular">{advancedCount}</span> : null}
          <ChevronDownIcon className="advanced-toggle__chevron" />
        </button>

        {advancedOpen ? (
          <div className="advanced" id={advancedId}>
            <fieldset className="filter-group">
              <legend>موقع الحي</legend>
              <div className="chips chips--grid">
                {DIRECTIONS.map((d) => {
                  const active = direction === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      className={active ? 'pill pill--soft is-active' : 'pill pill--soft'}
                      aria-pressed={active}
                      onClick={() => onDirection(active ? null : d.key)}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>
            <div className="filter-row">
              {cities ? (
                <label className="field field--select">
                  <span className="sr-only">المدينة</span>
                  <select name="city" value={city} onChange={(e) => onCity(e.target.value)}>
                    <option value="">المدينة</option>
                    {cities.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <ChevronDownIcon className="field__chevron" />
                </label>
              ) : null}
              <label className="field">
                <span className="sr-only">ميزانيتك القصوى بالريال</span>
                <input
                  type="text"
                  inputMode="numeric"
                  name="budget"
                  value={budget ? formatNumber(Number(budget)) : ''}
                  onChange={onBudgetChange}
                  placeholder="ميزانيتك (ريال)"
                  autoComplete="off"
                  className="tabular"
                />
              </label>
            </div>
            {advancedCount > 0 ? (
              <button type="button" className="btn btn--outline advanced__reset" onClick={resetAdvanced}>
                مسح الفلاتر
              </button>
            ) : null}
          </div>
        ) : null}
      </section>
  );
}
