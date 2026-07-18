import { useState } from "react";

/**
 * Text-based brand logo (no image assets required).
 * - "full": "UventoryBiz" wordmark (navy + coral accent)
 * - "mark": square navy tile with white "UBiz"
 *
 * When `src` is provided (tenant white-label logo), the image is rendered and
 * the text logo is used as an automatic fallback if the image fails to load.
 */

const NAVY = "#142F5C";
const CORAL = "#F6621E";
const FONT_STACK = "'Source Sans 3', 'Segoe UI', system-ui, -apple-system, sans-serif";

interface BrandLogoProps {
  variant?: "full" | "mark";
  /** Optional custom logo URL (e.g. tenant branding). Falls back to text logo on error. */
  src?: string | null;
  className?: string;
  alt?: string;
}

export function BrandLogo({ variant = "full", src, className, alt = "uventorybiz" }: BrandLogoProps) {
  const [imgFailed, setImgFailed] = useState(false);

  if (src && !imgFailed) {
    return <img src={src} alt={alt} className={className} onError={() => setImgFailed(true)} />;
  }

  if (variant === "mark") {
    return (
      <svg viewBox="0 0 64 64" className={className} role="img" aria-label={alt}>
        <rect width="64" height="64" rx="14" fill={NAVY} />
        <text
          x="32"
          y="33"
          textAnchor="middle"
          dominantBaseline="central"
          fill="#FFFFFF"
          fontFamily={FONT_STACK}
          fontWeight="800"
          fontSize="24"
          textLength="48"
          lengthAdjust="spacingAndGlyphs"
        >
          UBiz
        </text>
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 220 48" className={className} role="img" aria-label={alt}>
      <text
        x="0"
        y="34"
        fontFamily={FONT_STACK}
        fontWeight="800"
        fontSize="34"
        textLength="214"
        lengthAdjust="spacingAndGlyphs"
      >
        <tspan fill={NAVY}>Uventory</tspan>
        <tspan fill={CORAL}>Biz</tspan>
      </text>
    </svg>
  );
}
