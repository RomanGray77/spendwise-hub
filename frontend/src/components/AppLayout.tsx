import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, PieChart, PlusCircle, Tags, Wallet } from "lucide-react";

import { Button } from "@/components/ui/button";
import { spendBoard } from "@/services";

const NAV = [
  { to: "/", label: "Overview", icon: PieChart },
  { to: "/transactions/new", label: "Add transaction", icon: PlusCircle },
  { to: "/categories", label: "Categories", icon: Tags },
] as const;

export function AppLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    spendBoard.getCurrentUser().then((user) => {
      if (!active) return;
      if (!user) navigate({ to: "/login" });
      else setReady(true);
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Loading…
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border/70 bg-card/70 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 px-5 py-4">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-surface-ink text-surface-ink-foreground">
              <Wallet className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">SpendBoard</span>
          </Link>
          <nav className="flex flex-1 flex-wrap items-center gap-1">
            {NAV.map(({ to, label, icon: Icon }) => {
              const active = pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-secondary text-secondary-foreground font-medium"
                      : "text-muted-foreground hover:bg-secondary/60"
                  }`}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              );
            })}
          </nav>
          <Button
            variant="ghost"
            size="sm"
            onClick={async () => {
              await spendBoard.logout();
              navigate({ to: "/login" });
            }}
          >
            <LogOut className="size-4" /> Log out
          </Button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-8">{children}</main>
    </div>
  );
}
