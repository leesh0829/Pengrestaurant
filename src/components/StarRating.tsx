import { useState } from 'react'

type StarRatingProps = {
  value: number
  onChange?: (value: number) => void
  size?: 'sm' | 'md'
  showValue?: boolean
}

function StarShape() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="star-svg">
      <path d="M12 2.6l2.84 5.75 6.35.93-4.59 4.48 1.08 6.33L12 17.1 6.32 20.1l1.08-6.33L2.81 9.28l6.35-.93L12 2.6z" />
    </svg>
  )
}

export function StarRating({
  value,
  onChange,
  size = 'md',
  showValue = true,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null)
  const displayValue = hoverValue ?? value
  const interactive = Boolean(onChange)

  return (
    <div
      className={`star-rating ${interactive ? 'is-interactive' : ''} size-${size}`}
      onMouseLeave={() => setHoverValue(null)}
    >
      <div className="star-rating-track">
        {Array.from({ length: 5 }, (_, index) => {
          const starIndex = index + 1
          const fillPercent = Math.max(0, Math.min(1, displayValue - index)) * 100

          return (
            <div key={starIndex} className="star-rating-star">
              <div className="star-rating-star-base">
                <StarShape />
              </div>
              <div className="star-rating-star-fill" style={{ width: `${fillPercent}%` }}>
                <StarShape />
              </div>
              {interactive ? (
                <>
                  <button
                    type="button"
                    className="star-rating-hit left"
                    onMouseEnter={() => setHoverValue(starIndex - 0.5)}
                    onFocus={() => setHoverValue(starIndex - 0.5)}
                    onClick={() => onChange?.(starIndex - 0.5)}
                    aria-label={`${starIndex - 0.5}점`}
                    title={`${starIndex - 0.5}점`}
                  />
                  <button
                    type="button"
                    className="star-rating-hit right"
                    onMouseEnter={() => setHoverValue(starIndex)}
                    onFocus={() => setHoverValue(starIndex)}
                    onClick={() => onChange?.(starIndex)}
                    aria-label={`${starIndex}점`}
                    title={`${starIndex}점`}
                  />
                </>
              ) : null}
            </div>
          )
        })}
      </div>
      {showValue ? <strong className="star-rating-value">{displayValue.toFixed(1)}</strong> : null}
    </div>
  )
}
