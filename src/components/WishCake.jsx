import { useReducer } from 'react'
import { BirthdayCake } from './BirthdayCake'
import { extinguishCandle } from './surpriseState'

export function WishCake({ label, content, visible, note }) {
  const [candles, extinguish] = useReducer(extinguishCandle, [false, false, false])
  const complete = candles.every(Boolean)
  return <figure className={`finale-cake-scene${complete ? ' wish-complete' : ''}`} aria-hidden={!visible}>
    <div className="wish-cake"><BirthdayCake label={label} extinguished={candles} />
      {content.enabled && candles.map((off, index) => <button key={index} className={`candle-control candle-${index}`} disabled={!visible} aria-pressed={off} aria-label={`${off ? content.extinguishedLabel : content.candleLabel} ${index + 1}`} onClick={() => extinguish(index)}><span aria-hidden="true">{off ? '♡' : '✧'}</span></button>)}
    </div>
    <figcaption>{note}</figcaption>{content.enabled && <p className="wish-message" role="status">{complete ? content.message : content.hint}</p>}
  </figure>
}
