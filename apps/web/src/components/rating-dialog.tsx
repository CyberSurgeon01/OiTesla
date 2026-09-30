'use client';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';

import { MAX_RATING } from '@/lib/rating';
import { cn } from '@/lib/utils';

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0D0B]';

/**
 * The star-and-comment form for leaving a rating. Shared by the passenger rating their driver
 * and the driver rating a passenger so validation, wording and keyboard behaviour cannot
 * drift between the two roles.
 *
 * Mounted only while a ride is being rated: the parent owns the open ride, and closing is
 * driven by the parent clearing it, which keeps a skipped or submitted dialog from stranding
 * the half-filled state inside this component.
 */
export function RatingDialog({
  title,
  subtitle,
  submitLabel = 'Submit',
  submitting,
  onSubmit,
  onClose,
}: {
  title: string;
  subtitle: string;
  submitLabel?: string;
  submitting: boolean;
  onSubmit: (rating: number, comment: string) => void;
  onClose: () => void;
}) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');

  const titleId = 'rating-dialog-title';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-h-[90vh] w-full max-w-sm overflow-y-auto rounded-3xl border border-[#2C3831] bg-[#131815] p-6 shadow-2xl"
      >
        <h2 id={titleId} className="mb-2 text-center text-xl font-bold text-[#F3F4F6]">
          {title}
        </h2>
        <p className="mb-6 text-center text-sm text-[#A1A1AA]">{subtitle}</p>

        <div role="radiogroup" aria-label="Rating out of 5" className="mb-6 flex justify-center gap-2">
          {Array.from({ length: MAX_RATING }, (_, index) => index + 1).map((star) => (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={rating === star}
              aria-label={`${star} star${star === 1 ? '' : 's'}`}
              onClick={() => setRating(star)}
              className={cn(
                'text-4xl transition-transform hover:scale-110',
                FOCUS_RING,
                rating >= star ? 'text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]' : 'text-[#3F4A44]',
              )}
            >
              <span aria-hidden="true">&#9733;</span>
            </button>
          ))}
        </div>

        <label htmlFor="rating-dialog-comment" className="sr-only">Comment (optional)</label>
        <textarea
          id="rating-dialog-comment"
          placeholder="Leave a comment (optional)"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          className="mb-6 h-24 w-full resize-none rounded-xl border border-[#2C3831] bg-[#0A0D0B] p-3 text-sm text-[#F3F4F6] placeholder:text-[#8B93A0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#10B981]"
        />

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={cn(
              'flex-1 rounded-xl py-3 font-semibold text-[#A1A1AA] transition-colors hover:bg-[#1E2621] hover:text-[#F3F4F6] disabled:opacity-50',
              FOCUS_RING,
            )}
          >
            Skip
          </button>
          <button
            type="button"
            onClick={() => onSubmit(rating, comment)}
            disabled={rating === 0 || submitting}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#10B981] py-3 font-semibold text-[#022C22] transition-colors hover:bg-[#059669] disabled:cursor-not-allowed disabled:opacity-50',
              FOCUS_RING,
            )}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {submitting ? 'Saving\u2026' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
