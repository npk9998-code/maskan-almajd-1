'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';
import { createCity } from '@/app/admin/city-actions';
import { Switch } from '@/components/admin/CitiesList';
import DistrictsInput, { emptyDistricts } from '@/components/admin/DistrictsInput';
import { ChevronIcon } from '@/components/Icons';

export default function NewCityForm() {
  const [name, setName] = useState('');
  const [visible, setVisible] = useState(true);
  const [districts, setDistricts] = useState(emptyDistricts);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const [isPending, startTransition] = useTransition();

  const onSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrors({ name: 'اكتب اسم المدينة' });
      return;
    }
    setErrors({});
    setMessage('');
    startTransition(async () => {
      const result = await createCity({ name, visible, districts });
      if (result && !result.ok) {
        setErrors(result.errors ?? {});
        setMessage(result.message ?? '');
      }
    });
  };

  return (
    <form className="offer-form" onSubmit={onSubmit} noValidate>
      <header className="admin-header admin-header--form">
        <Link href="/admin/cities" className="icon-btn" aria-label="رجوع للمدن">
          <ChevronIcon />
        </Link>
        <div className="admin-header__text">
          <h1>إضافة مدينة</h1>
          <p>مع أحيائها وجهاتها</p>
        </div>
      </header>

      <div className="admin-body">
        {message ? (
          <p className="admin-error" role="alert">
            {message}
          </p>
        ) : null}

        <section className="form-section">
          <div className={errors.name ? 'field-block has-error' : 'field-block'}>
            <label className="field-label" htmlFor="c-name">
              اسم المدينة<span className="field-required"> *</span>
            </label>
            <div className="field">
              <input id="c-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
            </div>
            {errors.name ? <p className="field-error">{errors.name}</p> : null}
          </div>
          <div className="switch-row">
            <span>
              <strong>تظهر للعملاء</strong>
              <small>تقدر تغيرها بعدين من شاشة المدن</small>
            </span>
            <Switch checked={visible} onChange={setVisible} label="تظهر للعملاء" />
          </div>
        </section>

        <section className="form-section">
          <h2>الأحياء حسب الجهة</h2>
          <DistrictsInput value={districts} onChange={setDistricts} />
        </section>
      </div>

      <div className="save-bar">
        <button type="submit" className="btn btn--primary btn--lg" disabled={isPending}>
          {isPending ? 'جاري الحفظ…' : 'حفظ المدينة'}
        </button>
      </div>
    </form>
  );
}
