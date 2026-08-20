import { Link } from "@tanstack/react-router";
import {
  Home,
  PlusSquare,
  FolderClosed,
  Clapperboard,
  CheckSquare,
  Globe,
  Sparkles,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import type { ReactNode } from "react";

import trustTaiMark from "@/assets/trust-tai-mark.png";
import { activeWorld } from "@/lib/studio-data";
import { cn } from "@/lib/utils";

interface NavItem {
  label: string;
  icon: typeof Home;
  to?: string;
  badge?: string;
}

const primaryNav: NavItem[] = [
  { label: "Home", icon: Home, to: "/" },
  { label: "Create", icon: PlusSquare },
  { label: "Library", icon: FolderClosed },
];

const productionNav: NavItem[] = [
  { label: "In Production", icon: Clapperboard },
  { label: "Approvals", icon: CheckSquare, badge: "3" },
  { label: "World", icon: Globe },
];

function NavRow({ item, active = false }: { item: NavItem; active?: boolean }) {
  const Icon = item.icon;
  const content = (
    <>
      <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge ? (
        <span className="rounded-full bg-secondary px-2 py-0.5 font-mono text-[10px] text-warning">
          {item.badge}
        </span>
      ) : null}
    </>
  );

  const className = cn(
    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors duration-200",
    active
      ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
      : "text-foreground/80 hover:bg-secondary",
  );

  if (item.to) {
    return (
      <Link to={item.to} className={cn(className, "relative")}>
        {active ? (
          <span className="absolute top-2 bottom-2 -left-3 w-[3px] rounded-full bg-royal" />
        ) : null}
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} title="Coming next in Studio">
      {content}
    </button>
  );
}

export function SuiteShell({ children }: { children: ReactNode }) {
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
              <div className="eyebrow">Studio</div>
            </div>
          </div>

          <nav className="mt-8 flex flex-1 flex-col gap-1">
            {primaryNav.map((item) => (
              <NavRow key={item.label} item={item} active={item.label === "Home"} />
            ))}

            <div className="eyebrow mt-6 mb-1 px-3">Production</div>
            {productionNav.map((item) => (
              <NavRow key={item.label} item={item} />
            ))}

            <div className="my-4 h-px bg-border" />
            <button
              type="button"
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-foreground/80 transition-colors hover:bg-secondary"
              title="Coming next in Studio"
            >
              <Sparkles className="size-[18px]" strokeWidth={1.75} />
              <span className="flex-1 text-left">AI Director</span>
              <span className="rounded-full bg-royal-soft px-2 py-0.5 font-mono text-[10px] text-royal">
                BETA
              </span>
            </button>
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
            <button
              type="button"
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-royal hover:underline"
            >
              View World <ChevronRight className="size-3" />
            </button>
          </div>

          <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
            <div className="flex size-9 items-center justify-center rounded-full bg-primary font-mono text-xs text-primary-foreground">
              TL
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">Tai Lopez</div>
              <div className="truncate text-xs text-muted-foreground">Studio Executive</div>
            </div>
            <ChevronDown className="size-4 text-muted-foreground" />
          </div>
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
              <span className="eyebrow">Studio</span>
              <span className="hidden text-sm text-muted-foreground sm:inline">
                Your creative production room
              </span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="hidden font-mono text-[11px] text-muted-foreground md:inline">
                {activeWorld.canon}
              </span>
              <div className="flex size-8 items-center justify-center rounded-full bg-primary font-mono text-[11px] text-primary-foreground lg:hidden">
                TL
              </div>
            </div>
          </header>

          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
