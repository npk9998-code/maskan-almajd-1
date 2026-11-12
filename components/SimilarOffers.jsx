import Link from 'next/link';
import { TYPE_ICON } from '@/components/Icons';
import { offerHeading, shortPrice, typeName } from '@/lib/format';

export default function SimilarOffers({ offers }) {
  if (!offers.length) return null;
  return (
    <section className="similar" aria-labelledby="similar-title">
      <h2 id="similar-title">عروض مشابهة</h2>
      <ul className="similar__grid">
        {offers.map((o) => {
          const Icon = TYPE_ICON[o.type];
          const thumb = o.images[0]?.thumb;
          return (
            <li key={o.id}>
              <Link href={`/offers/${o.id}`} className="similar__item">
                <span className={thumb ? 'similar__media' : 'similar__media similar__media--cover'}>
                  {thumb ? (
                    <img src={thumb} alt="" width={240} height={240} loading="lazy" decoding="async" />
                  ) : (
                    <Icon />
                  )}
                </span>
                <span className="similar__district">{offerHeading(o)}</span>
                <span className="similar__type">{typeName(o)}</span>
                <span className="similar__price tabular">{shortPrice(o)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
