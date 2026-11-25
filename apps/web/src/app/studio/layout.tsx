import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import type { UserDto } from "@creator-platform/contracts";
import { Brand } from "@/components/brand";
import { PoweredBy } from "@/components/powered-by";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutButton } from "@/components/studio/sign-out-button";
import { StudioNav } from "@/components/studio/studio-nav";
import { getInitials } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";

export const metadata: Metadata = { title: "Creator studio" };

export default async function StudioLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return <StudioFrame user={user}>{children}</StudioFrame>;
}

function StudioFrame({ user, children }: { user: UserDto; children: ReactNode }) {
  return (
    <div className="studio-shell">
      <a className="skip-link" href="#studio-content">Skip to content</a>
      <aside className="studio-sidebar">
        <div className="studio-sidebar__brand"><Brand /></div>
        <span className="studio-sidebar__label">Workspace</span>
        <StudioNav />
        <div className="sidebar-account">
          <span className="avatar">{getInitials(user.displayName)}</span>
          <span className="sidebar-account__copy"><strong>{user.displayName}</strong><small>{user.email}</small></span>
        </div>
        <PoweredBy className="powered-by--sidebar" />
      </aside>

      <div className="studio-main">
        <header className="studio-topbar">
          <div className="studio-topbar__title"><span className="status-dot" /> Creator studio</div>
          <div className="studio-topbar__account">
            {user.status === "SUSPENDED" ? <span className="account-warning">Account suspended</span> : null}
            <ThemeToggle />
            <span className="account-chip"><span className="avatar avatar--small">{getInitials(user.displayName)}</span><span><strong>{user.displayName}</strong><small>{user.role === "VIEWER" ? "Viewer" : user.role === "ADMIN" ? "Admin" : "Creator"}</small></span></span>
            <SignOutButton />
          </div>
        </header>
        <main className="studio-content" id="studio-content">{children}</main>
      </div>
    </div>
  );
}
