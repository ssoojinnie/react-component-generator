/**
 * Pixel-drawn system icons on a 16x16 grid (32x32 for the dialog sizes),
 * matching the era's icon metrics. shapeRendering keeps edges crisp.
 */

const crisp = { shapeRendering: 'crispEdges' as const };

interface IconProps {
  size?: number;
  className?: string;
}

export function AppIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
      {...crisp}
    >
      <rect x="1" y="2" width="14" height="12" fill="#c0c0c0" stroke="#000000" />
      <rect x="2" y="3" width="12" height="3" fill="#000080" />
      <rect x="11" y="4" width="2" height="1" fill="#ffffff" />
      <rect x="3" y="8" width="4" height="4" fill="#008080" />
      <rect x="8" y="8" width="4" height="2" fill="#ffffff" />
      <rect x="8" y="11" width="4" height="1" fill="#ffffff" />
    </svg>
  );
}

export function WindowIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
      {...crisp}
    >
      <rect x="2" y="2" width="12" height="12" fill="#ffffff" stroke="#000000" />
      <rect x="3" y="3" width="10" height="3" fill="#000080" />
      <rect x="4" y="8" width="8" height="1" fill="#008080" />
      <rect x="4" y="10" width="6" height="1" fill="#808080" />
      <rect x="4" y="12" width="7" height="1" fill="#808080" />
    </svg>
  );
}

export function ErrorIcon({ size = 32, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14" fill="#a80000" />
      <circle cx="16" cy="16" r="14" fill="none" stroke="#6b0000" strokeWidth="2" />
      <path
        d="M10 10 L22 22 M22 10 L10 22"
        stroke="#ffffff"
        strokeWidth="4"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function EmptyIcon({ size = 44, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      aria-hidden="true"
      {...crisp}
    >
      <rect x="2" y="5" width="22" height="18" fill="#ffffff" stroke="#000000" />
      <rect x="3" y="6" width="20" height="4" fill="#808080" />
      <rect x="6" y="13" width="14" height="1" fill="#c0c0c0" />
      <rect x="6" y="16" width="11" height="1" fill="#c0c0c0" />
      <rect x="6" y="19" width="13" height="1" fill="#c0c0c0" />
      <rect x="8" y="11" width="22" height="18" fill="#ffffff" stroke="#000000" />
      <rect x="9" y="12" width="20" height="4" fill="#000080" />
      <rect x="26" y="13" width="2" height="1" fill="#ffffff" />
      <rect x="12" y="19" width="7" height="7" fill="#008080" />
      <rect x="21" y="19" width="6" height="2" fill="#c0c0c0" />
      <rect x="21" y="23" width="6" height="3" fill="#c0c0c0" />
    </svg>
  );
}

export function KeyReadyIcon({ size = 13, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 13 13"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M1 7 L4.5 10.5 L12 2.5"
        fill="none"
        stroke="#007000"
        strokeWidth="2.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

export function KeyMissingIcon({ size = 13, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 13 13"
      className={className}
      aria-hidden="true"
    >
      <circle cx="6.5" cy="6.5" r="6" fill="#000080" />
      <rect x="5.5" y="2.5" width="2" height="5" fill="#ffffff" />
      <rect x="5.5" y="8.5" width="2" height="2" fill="#ffffff" />
    </svg>
  );
}

export function RefreshIcon({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M11.5 7a4.5 4.5 0 1 1-1.6-3.45"
        fill="none"
        stroke="#000000"
        strokeWidth="2"
      />
      <path d="M12.6 1v4h-4z" fill="#000000" />
    </svg>
  );
}

export function StartIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-hidden="true"
      {...crisp}
    >
      <rect x="1" y="3" width="6" height="5" fill="#d02020" />
      <rect x="8" y="2" width="6" height="5" fill="#20a020" />
      <rect x="1" y="9" width="6" height="5" fill="#2050d0" />
      <rect x="8" y="8" width="6" height="5" fill="#e0b020" />
    </svg>
  );
}
