"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/icons";

const links: { href: string; label: string; icon: IconName; exact?: boolean }[] = [
  { href: "/studio", label: "Overview", icon: "grid", exact: true },
  { href: "/studio/videos", label: "Videos", icon: "video", exact: true },
  { href: "/studio/videos/new", label: "Upload", icon: "upload" },
  { href: "/studio/profile", label: "Profile", icon: "profile" },
];

export function StudioNav() {
  const pathname = usePathname();

  return (
    <nav className="studio-nav" aria-label="Studio navigation">
      {links.map((link) => {
        const active = link.exact ? pathname === link.href : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            className={`studio-nav__link${active ? " is-active" : ""}`}
            href={link.href}
            aria-current={active ? "page" : undefined}
          >
            <Icon name={link.icon} />
            <span>{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
