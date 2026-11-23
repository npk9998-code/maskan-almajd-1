'use client';

import { usePathname, useRouter } from 'next/navigation';
import { HeartIcon } from '@/components/Icons';
import { requestFavoritesOnHome, setShowFavorites, useFavorites, useShowFavorites } from '@/lib/favorites';

export default function FavoritesHeaderButton() {
  const favorites = useFavorites();
  const showing = useShowFavorites();
  const pathname = usePathname();
  const router = useRouter();
  const count = favorites.length;
  const onHome = pathname === '/';
  const active = onHome && showing;

  const onClick = () => {
    if (onHome) {
      setShowFavorites(!showing);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      requestFavoritesOnHome();
      router.push('/');
    }
  };

  return (
    <button
      type="button"
      className={active ? 'btn btn--outline btn--icon fav-header is-active' : 'btn btn--outline btn--icon fav-header'}
      aria-pressed={active}
      aria-label={`المفضلة (${count})`}
      onClick={onClick}
    >
      <HeartIcon filled={active || count > 0} />
      {count > 0 ? <span className="fav-header__count tabular">{count}</span> : null}
    </button>
  );
}
