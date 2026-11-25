import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand${compact ? " brand--compact" : ""}`} href="/" aria-label="Frame home">
      <svg className="brand-mark" viewBox="0 0 36 36" fill="none" aria-hidden="true">
        <rect x="1" y="1" width="34" height="34" rx="11" fill="url(#frame-mark)" />
        <path d="M14 10.8C14 9.8 15.1 9.2 15.9 9.7L25.2 15.5C26 16 26 17.5 25.2 18L15.9 23.8C15.1 24.3 14 23.7 14 22.7V10.8Z" fill="white" />
        <path d="M9 12V24" stroke="white" strokeWidth="2.4" strokeLinecap="round" opacity=".72" />
        <defs>
          <linearGradient id="frame-mark" x1="3" y1="3" x2="33" y2="33" gradientUnits="userSpaceOnUse">
            <stop stopColor="#9B7BFF" />
            <stop offset="1" stopColor="#46D9E8" />
          </linearGradient>
        </defs>
      </svg>
      <span>Frame</span>
    </Link>
  );
}
