interface DesignGapProps {
  description: string;
}

/**
 * Inline callout for intentionally incomplete UI elements.
 * Use when the blueprint doesn't yet have a contract for this data or the
 * decision hasn't been made yet. Renders a subtle "TBD" badge with a tooltip.
 */
export function DesignGap({ description }: DesignGapProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: '#faf3d1',
        border: '1px solid #face00',
        borderRadius: '99px',
        padding: '0.1rem 0.5rem',
        fontSize: '0.7rem',
        color: '#775540',
        fontWeight: 600,
      }}
      title={description}
      aria-label={`Design gap: ${description}`}
    >
      TBD
    </span>
  );
}
