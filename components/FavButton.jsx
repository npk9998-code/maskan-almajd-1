'use client';

import { HeartIcon } from '@/components/Icons';
import { toggleFavorite, useFavorites } from '@/lib/favorites';

export default function FavButton({ id, className = 'fav-btn' }) {
  const favorites = useFavorites();
  const active = favorites.includes(id);
  return (
    <button
      type="button"
      className={active ? `${className} is-active` : className}
      aria-pressed={active}
      aria-label={active ? `شيل العرض رقم ${id} من المفضلة` : `أضف العرض رقم ${id} للمفضلة`}
      onClick={(e) => {
        e.preventDefault();
        toggleFavorite(id);
      }}
    >
      <HeartIcon filled={active} />
    </button>
  );
}
