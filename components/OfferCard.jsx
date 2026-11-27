import Link from 'next/link';
import FavButton from '@/components/FavButton';
import { AreaIcon, BathIcon, BedIcon, ChatIcon, CompassIcon, PinIcon, RoadIcon } from '@/components/Icons';
import { NumberBadge, OfferCover, SoldCover, StatusBadge, Watermark } from '@/components/OfferMedia';
import WhatsAppLink from '@/components/WhatsAppLink';
import { areaText, bathsText, formatNumber, offerHeading, offerSubtitle, priceInfo, pricePerMeter, roomsText } from '@/lib/format';

function CardSpecs({ offer }) {
  const items =
    offer.type === 'other'
      ? [
          { Icon: AreaIcon, text: offer.area ? areaText(offer.area) : null },
          { Icon: BedIcon, text: offer.rooms != null ? roomsText(offer.rooms) : null },
          { Icon: BathIcon, text: offer.bathrooms != null ? bathsText(offer.bathrooms) : null },
          { Icon: RoadIcon, text: offer.streetWidth ? `شارع ${offer.streetWidth} م` : null },
          { Icon: CompassIcon, text: offer.facade },
        ]
          .filter((item) => item.text)
          .slice(0, 3)
      : offer.type === 'land'
      ? [
          { Icon: AreaIcon, text: offer.area ? areaText(offer.area) : null },
          { Icon: RoadIcon, text: offer.streetWidth ? `شارع ${offer.streetWidth} م` : null },
          { Icon: CompassIcon, text: offer.facade },
        ]
      : [
          { Icon: AreaIcon, text: offer.area ? areaText(offer.area) : null },
          { Icon: BedIcon, text: offer.rooms != null ? roomsText(offer.rooms) : null },
          { Icon: BathIcon, text: offer.bathrooms != null ? bathsText(offer.bathrooms) : null },
        ];
  return (
    <ul className="card__specs">
      {items.filter((item) => item.text).map(({ Icon, text }) => (
        <li key={text}>
          <Icon className="icon-sm" />
          <span>{text}</span>
        </li>
      ))}
    </ul>
  );
}

export default function OfferCard({ offer, priority = false, whatsappHref }) {
  const href = `/offers/${offer.id}`;
  const price = priceInfo(offer);
  const hasImage = Boolean(offer.image);
  const title = offerHeading(offer);
  const ppm = pricePerMeter(offer);

  return (
    <article className={['card', offer.status === 'sold' ? 'card--sold' : '', offer.featured ? 'card--featured' : ''].filter(Boolean).join(' ')}>
      <div className="card__media-wrap">
      <Link href={href} className="card__media" tabIndex={-1} aria-hidden="true">
        {hasImage ? (
          <img
            src={offer.image}
            alt=""
            width={640}
            height={400}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : 'auto'}
            decoding="async"
          />
        ) : (
          <OfferCover offer={offer} />
        )}
        <span className="media__top">
          <StatusBadge offer={offer} isNew={offer.isNew} dropped={offer.priceDropped} />
          <NumberBadge id={offer.id} />
        </span>
        {hasImage ? null : <Watermark onCover />}
        {offer.status === 'sold' ? <SoldCover /> : null}
      </Link>
      <FavButton id={offer.id} />
      </div>

      <div className="card__body">
        <h3 className="card__title">{title}</h3>
        <p className="card__location">
          <PinIcon className="icon-sm" />
          <span>{offerSubtitle(offer)}</span>
        </p>
        <CardSpecs offer={offer} />

        <div className="card__footer">
          <div className="price">
            <p className={price.hidden ? 'price__value price__value--hidden' : 'price__value'}>
              {price.text}
            </p>
            {offer.priceDropped && offer.previousPrice ? (
              <p className="price__old tabular">
                <s>{formatNumber(offer.previousPrice)} ريال</s>
              </p>
            ) : null}
            {price.note ? <p className="price__note">{price.note}</p> : null}
            {ppm ? <p className="price__ppm tabular">{ppm}</p> : null}
          </div>
          <div className="card__actions">
            <Link href={href} className="btn btn--outline" aria-label={`تفاصيل العرض رقم ${offer.id}`}>
              التفاصيل
            </Link>
            {whatsappHref ? (
              <WhatsAppLink
                offerId={offer.id}
                href={whatsappHref}
                className="btn btn--wa btn--icon"
                label={`تواصل عبر واتساب عن العرض رقم ${offer.id}`}
              >
                <ChatIcon />
              </WhatsAppLink>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
