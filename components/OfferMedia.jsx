import { TYPE_ICON } from '@/components/Icons';
import { offerTitle } from '@/lib/format';
import { SITE } from '@/lib/site';

// الغلاف الأخضر للعرض اللي ما فيه صور
export function OfferCover({ offer, size = 'card' }) {
  const Icon = TYPE_ICON[offer.type];
  return (
    <div className={`cover cover--${size}`}>
      <Icon className="cover__icon" strokeWidth={1.5} />
      <span className="cover__label">{offerTitle(offer)}</span>
    </div>
  );
}

export function NumberBadge({ id }) {
  return <span className="chip chip--number">رقم {id}</span>;
}

// شارات العرض: فرصة، جديد، نزل السعر (المباع له تظليل لحاله)
export function StatusBadge({ offer, isNew, dropped }) {
  const sold = offer.status === 'sold';
  const items = [];
  if (offer.featured && !sold) items.push(<span key="f" className="chip chip--featured">✨ فرصة</span>);
  if (isNew && !sold) items.push(<span key="n" className="chip chip--new">جديد</span>);
  if (dropped && !sold) items.push(<span key="d" className="chip chip--drop">🔻 نزل السعر</span>);
  if (!items.length) return null;
  return <span className="badges">{items}</span>;
}

export function SoldCover() {
  return (
    <span className="sold-cover" aria-hidden="true">
      <span>تم البيع</span>
    </span>
  );
}

export function Watermark({ onCover }) {
  return (
    <span className={onCover ? 'watermark watermark--cover' : 'watermark'}>{SITE.shortName}</span>
  );
}
