"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, ExternalLink, FolderKanban, LogOut, Menu, Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

interface SidebarProps {
  userEmail: string | undefined;
}

const navItems = [
  { href: "/", label: "Projects", icon: FolderKanban },
  { href: "/settings", label: "Settings", icon: Settings },
  {
    href: "https://dashboards-panel.maximo-seo.ai/",
    label: "Dashboards Panel",
    icon: ExternalLink,
    external: true,
  },
];

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    toast.success("Signed out");
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center justify-between border-b p-4 md:hidden">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <BarChart3 className="h-5 w-5" />
          SERP Tracker
        </Link>
        <Sheet>
          <SheetTrigger>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Open menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <div className="flex h-full flex-col">
              <Link href="/" className="flex items-center gap-2 pb-6 font-semibold">
                <BarChart3 className="h-5 w-5" />
                SERP Tracker
              </Link>
              <nav className="flex-1 space-y-1">
                {navItems.map((item) => (
                  <NavItem key={item.href} item={item} pathname={pathname} />
                ))}
              </nav>
              <div className="border-t pt-4">
                <p className="mb-2 truncate px-3 text-xs text-muted-foreground">
                  {userEmail}
                </p>
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={handleSignOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden w-64 flex-col border-r bg-muted/40 md:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <BarChart3 className="h-5 w-5" />
            SERP Tracker
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavItem key={item.href} item={item} pathname={pathname} />
          ))}
        </nav>
        <div className="border-t p-3">
          <p className="mb-2 truncate px-3 text-xs text-muted-foreground">
            {userEmail}
          </p>
          <Button
            variant="ghost"
            className="w-full justify-start"
            onClick={handleSignOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>
    </>
  );
}

function NavItem({
  item,
  pathname,
}: {
  item: {
    href: string;
    label: string;
    icon: React.ElementType;
    external?: boolean;
  };
  pathname: string;
}) {
  const isActive =
    !item.external &&
    (pathname === item.href || pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;

  const className = cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    isActive
      ? "bg-primary text-primary-foreground"
      : "text-muted-foreground hover:bg-muted hover:text-foreground"
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        <Icon className="h-4 w-4" />
        {item.label}
      </a>
    );
  }

  return (
    <Link href={item.href} className={className}>
      <Icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}
