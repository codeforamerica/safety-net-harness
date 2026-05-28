interface BlueprintAdditionProps {
  description: string;
}

/**
 * Inline callout for blueprint capabilities the reference vendor design doesn't include.
 * Use when the blueprint provides something beyond what the state's existing system offers.
 * Renders a subtle "Blueprint" badge with a tooltip.
 */
export function BlueprintAddition({ description }: BlueprintAdditionProps) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '0.25rem',
        background: '#e7f2e7',
        border: '1px solid #4d8055',
        borderRadius: '99px',
        padding: '0.1rem 0.5rem',
        fontSize: '0.7rem',
        color: '#2e5e35',
        fontWeight: 600,
      }}
      title={description}
      aria-label={`Blueprint addition: ${description}`}
    >
      New
    </span>
  );
}
