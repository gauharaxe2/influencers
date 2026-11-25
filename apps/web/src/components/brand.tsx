import Image from "next/image";
import Link from "next/link";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`brand${compact ? " brand--compact" : ""}`} href="/" aria-label="Influence home">
      <Image
        className="brand-logo"
        src="/brand/influence-logo.png"
        alt="Influence — Your Work, Amplified."
        width={640}
        height={240}
        priority
      />
    </Link>
  );
}
