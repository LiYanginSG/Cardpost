import Link from "next/link";
import type { User } from "@prisma/client";
import { IconAccount, IconMailbox, IconStore, IconWall, IconWrite } from "./icons";
import { DevClock } from "./dev-clock";
import { LandDefs } from "./world-map";
import { TIME_TRAVEL_ENABLED, clockOffsetDays, now } from "@/lib/clock";
import { fmtDateYear } from "@/lib/format";

export type Tab = "mailbox" | "wall" | "write" | "store" | "account";

const TABS: { id: Tab; label: string; href: string; Icon: () => React.JSX.Element }[] = [
  { id: "mailbox", label: "Mailbox", href: "/mailbox", Icon: IconMailbox },
  { id: "wall", label: "Wall", href: "/wall", Icon: IconWall },
  { id: "write", label: "Write", href: "/write", Icon: IconWrite },
  { id: "store", label: "Store", href: "/store", Icon: IconStore },
  { id: "account", label: "Account", href: "/account", Icon: IconAccount },
];

export async function AppShell({ user, active, children }: { user: User; active?: Tab; children: React.ReactNode }) {
  const offset = await clockOffsetDays();
  const n = await now();
  return (
    <>
      <div className="stripe" />
      <LandDefs />
      {TIME_TRAVEL_ENABLED && <DevClock offsetDays={offset} nowLabel={fmtDateYear(n)} />}
      <div className="shell">
        <aside className="rail">
          <Link href="/mailbox" className="brand"><span className="mark" />Cardpost</Link>
          <nav>
            {TABS.map(({ id, label, href, Icon }) => (
              <Link key={id} href={href} className={id === active ? "on" : ""}><Icon />{label}</Link>
            ))}
          </nav>
          <div className="foot">
            <div className="balance" style={{ alignItems: "flex-start" }}>
              <span>postage</span><b>{user.postage}</b>
              <span className="base" />
            </div>
            <p style={{ marginTop: 12 }}>Free postage arrives every Sunday. Distance is the price.</p>
          </div>
        </aside>
        <main className="main">
          <header className="topbar">
            <Link href="/mailbox" className="brand"><span className="mark" />Cardpost</Link>
            <Link href="/store" className="balance" aria-label={`${user.postage} postage`}>
              <span>postage</span><b>{user.postage}</b>
              <span className="base" />
            </Link>
          </header>
          {children}
        </main>
      </div>
      <nav className="tabbar" aria-label="Primary">
        {TABS.map(({ id, label, href, Icon }) => (
          <Link key={id} href={href} className={`${id === active ? "on" : ""} ${id === "write" ? "write" : ""}`}><Icon />{label}</Link>
        ))}
      </nav>
    </>
  );
}
