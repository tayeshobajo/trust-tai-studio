import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  PlusSquare,
  FolderClosed,
  Clapperboard,
  CheckSquare,
  Globe,
  ChevronRight,
} from "lucide-react";
import type { ReactNode } from "react";

import trustTaiMark from "@/assets/trust-tai-mark.png";
import { activeWorld } from "@/lib/studio-data";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: typeof Home;
  to: string;
  badge?: string;
}

/** Rooms of the Trust Tai Suite. Studio is the active room; the others live
 *  in the shared Suite and are linked, not re-implemented here. */
const suiteRooms = ["Projects", "Roadmap", "Comms", "Steward", "Studio"] as const;

const studioNav: NavItem[] = [
  { label: "Home", icon: Home, to: "/" },
  { label: "Create", icon: PlusSquare, to: "/create" },
  { label: "Library", icon: FolderClosed, to: "/library" },
];

const productionNav: NavItem[] = [
  { label: "In Production", icon: Clapperboard, to: "/production" },
  { label: "Approvals", icon: CheckSquare, to: "/approvals", badge: "3" },
  { label: "World", icon: Globe, to: "/world" },
];

function NavRow({ item, active = false }: { item: NavItem; active?: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.to}
      className={cn(
        "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-200",
        active
          ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
          : "text-foreground/80 hover:bg-secondary",
      )}
    >
      {active ? (
        <span className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-full bg-royal" />
      ) : null}
      <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-warning">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export function SuiteShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        {/* Suite navigation rail */}
        <aside className="sticky top-0 hidden h-screen w-[264px] shrink-0 flex-col border-r border-border bg-sidebar px-6 py-6 lg:flex">
          <div className="flex items-center gap-3">
            <img
              src={trustTaiMark}
              alt="Trust Tai"
              width={512}
              height={512}
              className="size-8 object-contain"
            />
            <div className="leading-tight">
              <div className="font-display text-lg tracking-wide text-foreground">TRUST TAI</div>
              <div className="eyebrow">Suite</div>
            </div>
          </div>

          {/* Suite rooms — Studio is the active room */}
          <div className="mt-7">
            <div className="eyebrow mb-2 px-3">Rooms</div>
            <div className="flex flex-wrap gap-1.5 px-1">
              {suiteRooms.map((room) => {
                const isStudio = room === "Studio";
                return (
                  <span
                    key={room}
                    className={cn(
                      "rounded-full px-2.5 py-1 font-mono text-[10px] tracking-wide",
                      isStudio
                        ? "bg-royal-soft text-royal"
                        : "border border-border text-muted-foreground",
                    )}
                    title={isStudio ? "You are here" : "Lives in the Trust Tai Suite"}
                  >
                    {room.toUpperCase()}
                  </span>
                );
              })}
            </div>
          </div>

          <nav className="mt-7 flex flex-1 flex-col gap-1">
            <div className="eyebrow mb-1 px-3">Studio</div>
            {studioNav.map((item) => (
              <NavRow key={item.label} item={item} active={item.to === pathname} />
            ))}

            <div className="eyebrow mt-6 mb-1 px-3">Production</div>
            {productionNav.map((item) => (
              <NavRow key={item.label} item={item} active={item.to === pathname} />
            ))}
          </nav>

          {/* Active World */}
          <div className="rounded-xl border border-border bg-card p-3 shadow-tt">
            <div className="flex gap-3">
              <img
                src={activeWorld.thumbnail}
                alt=""
                width={512}
                height={512}
                loading="lazy"
                className="size-14 rounded-lg object-cover"
              />
              <div className="min-w-0">
                <div className="eyebrow">Active World</div>
                <div className="truncate text-sm font-medium">{activeWorld.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {activeWorld.subtitle}
                </div>
              </div>
            </div>
            <Link
              to="/world"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-royal hover:underline"
            >
              View World <ChevronRight className="size-3" />
            </Link>
          </div>

          <p className="mt-4 border-t border-border pt-4 text-xs text-muted-foreground">
            Signed-in identity comes from the Trust Tai Suite once shared auth is connected.
          </p>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Suite header */}
          <header className="sticky top-0 z-20 flex items-center gap-4 border-b border-border bg-background/85 px-6 py-4 backdrop-blur-sm lg:px-12">
            <img
              src={trustTaiMark}
              alt="Trust Tai"
              width={512}
              height={512}
              className="size-7 object-contain lg:hidden"
            />
            <div className="flex items-baseline gap-3">
              <span className="font-display text-base tracking-wide lg:hidden">TRUST TAI</span>
              <span className="eyebrow">Suite · Studio</span>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                The creative production room
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">
                {activeWorld.canon}
              </span>
            </div>
          </header>

          {/* Mobile room nav */}
          <nav className="flex gap-1 overflow-x-auto border-b border-border px-6 py-2 lg:hidden">
            {[...studioNav, ...productionNav].map((item) => (
              <Link
                key={item.label}
                to={item.to}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs whitespace-nowrap",
                  item.to === pathname
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground",
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
