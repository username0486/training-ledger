import { Link2 } from 'lucide-react';

interface GroupLinkChipProps {
  childrenCount: number;
  className?: string;
}

/**
 * Blue chip with link icon and exercise count.
 * Renders as: [ 🔗 2 exercises ] or [ 🔗 1 exercise ]
 */
export function GroupLinkChip({ childrenCount, className = '' }: GroupLinkChipProps) {
  return (
    <span
      data-no-drag
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-accent/10 text-accent border border-accent/20 text-xs ${className}`}
      aria-label={`${childrenCount} ${childrenCount === 1 ? 'exercise' : 'exercises'} in group`}
    >
      <Link2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {childrenCount} exercise{childrenCount > 1 ? 's' : ''}
    </span>
  );
}
