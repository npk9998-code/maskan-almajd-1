'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { loginWithPin } from '@/app/admin/actions';
import { HouseIcon, LockIcon } from '@/components/Icons';
import { SITE } from '@/lib/site';

const PIN_LENGTH = 6;
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

function BackspaceIcon(props) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      <path d="M8.5 5H20a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8.5L3 12z" />
      <path d="M11.5 9.5l5 5M16.5 9.5l-5 5" />
    </svg>
  );
}

export default function PinLogin() {
  const [pin, setPin] = useState('');
  const [message, setMessage] = useState('');
  const [locked, setLocked] = useState(false);
  const [shake, setShake] = useState(false);
  const [isPending, startTransition] = useTransition();
  const pinRef = useRef('');

  const submit = useCallback((value) => {
    startTransition(async () => {
      const result = await loginWithPin(value);
      // إذا نجح، السيرفر يحولك للوحة التحكم
      if (result && !result.ok) {
        setMessage(result.message);
        setLocked(Boolean(result.locked));
        setShake(true);
        pinRef.current = '';
        setPin('');
      }
    });
  }, []);

  const press = useCallback(
    (digit) => {
      if (isPending || pinRef.current.length >= PIN_LENGTH) return;
      const next = pinRef.current + digit;
      pinRef.current = next;
      setPin(next);
      setMessage('');
      if (next.length === PIN_LENGTH) submit(next);
    },
    [isPending, submit],
  );

  const erase = useCallback(() => {
    if (isPending) return;
    pinRef.current = pinRef.current.slice(0, -1);
    setPin(pinRef.current);
  }, [isPending]);

  // الكيبورد (للكمبيوتر)
  useEffect(() => {
    const onKey = (e) => {
      if (/^[0-9]$/.test(e.key)) press(e.key);
      else if (e.key === 'Backspace') erase();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press, erase]);

  return (
    <main className="pin">
      <div className="pin__head">
        <span className="pin__logo" aria-hidden="true">
          <HouseIcon />
        </span>
        <h1>لوحة التحكم</h1>
        <p>{SITE.name}</p>
      </div>

      <p className="pin__prompt">أدخل رمز الدخول</p>
      <div
        className={shake ? 'pin__dots is-shaking' : 'pin__dots'}
        onAnimationEnd={() => setShake(false)}
        role="img"
        aria-label={`تم إدخال ${pin.length} من ${PIN_LENGTH} أرقام`}
      >
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={i < pin.length ? 'pin__dot is-filled' : 'pin__dot'} />
        ))}
      </div>

      <p className={locked ? 'pin__message is-locked' : 'pin__message'} aria-live="polite">
        {isPending ? 'جاري التحقق…' : message}
      </p>

      <div className="pin__pad" dir="ltr">
        {KEYS.map((k) => (
          <button key={k} type="button" className="pin__key" onClick={() => press(k)} disabled={isPending}>
            {k}
          </button>
        ))}
        <span aria-hidden="true" />
        <button type="button" className="pin__key" onClick={() => press('0')} disabled={isPending}>
          0
        </button>
        <button
          type="button"
          className="pin__key pin__key--ghost"
          onClick={erase}
          disabled={isPending || pin.length === 0}
          aria-label="مسح آخر رقم"
        >
          <BackspaceIcon />
        </button>
      </div>

      <p className="pin__note">
        <LockIcon className="icon-sm" />
        <span>صفحة خاصة، ما يدخلها غيرك</span>
      </p>
    </main>
  );
}
