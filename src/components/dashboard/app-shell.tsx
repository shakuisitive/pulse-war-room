"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Settings,
  UserCircle,
  Users,
} from "lucide-react";

import { signOutAction } from "@/app/actions/auth";
import { OrgPresence } from "@/components/dashboard/org-presence";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/team", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/profile", label: "Profile", icon: UserCircle },
];

export function AppShell({
  children,
  orgId,
  orgName,
  currentUser,
}: {
  children: React.ReactNode;
  orgId: string;
  orgName: string;
  currentUser: { userId: string; displayName: string; orgRole: string };
}) {
  const pathname = usePathname();

  const sidebar = (
    <div className="flex h-full flex-col gap-6 p-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Organization
        </p>
        <p className="font-semibold text-foreground">{orgName}</p>
      </div>
      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Separator />
      <OrgPresence orgId={orgId} currentUser={currentUser} />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-72 border-r border-border bg-card lg:block">
        {sidebar}
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  Menu
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                {sidebar}
              </SheetContent>
            </Sheet>
            <div>
              <p className="text-sm font-semibold text-foreground">Pulse</p>
              <p className="text-xs text-muted-foreground">{orgName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="size-4" />
            </Button>
            <Badge variant="secondary" className="capitalize">
              {currentUser.orgRole}
            </Badge>
            <Avatar className="size-8">
              <AvatarFallback>
                {currentUser.displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <form action={signOutAction}>
              <Button variant="outline" size="sm" type="submit">
                <LogOut className="size-4" />
                Sign out
              </Button>
            </form>
          </div>
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
