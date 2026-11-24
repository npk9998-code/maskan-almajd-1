import Link from 'next/link';
import { TYPE_ICON } from '@/components/Icons';
import { areaText, shortPrice, typeName } from '@/lib/format';

export default function MiniOfferCard({ offer }) {
  const Icon = TYPE_ICON[offer.type];
  return (
    <Link href={`/offers/${offer.id}`} className="mini-card">
      <span className={offer.image ? 'mini-card__media' : 'mini-card__media mini-card__media--cover'}>
        {offer.image ? <img src={offer.image} alt="" width={280} height={180} loading="lazy" decoding="async" /> : <Icon />}
        {offer.status === 'sold' ? <span className="chip chip--sold mini-card__chip">تم البيع</span> : null}
      </span>
      <span className="mini-card__body">
        <span className="mini-card__title">{typeName(offer)} للبيع</span>
        {offer.area ? <span className="mini-card__meta tabular">{areaText(offer.area)}</span> : null}
        <span className="mini-card__price tabular">{shortPrice(offer)}</span>
      </span>
    </Link>
  );
}
