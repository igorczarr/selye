"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import { Suspense } from "react";
import { SelyeLogo } from "@/components/brand/logo";
import {
  Home,
  Dumbbell,
  Users,
  BarChart3,
  User,
  Shield,
  Settings,
  PlusCircle,
  Activity,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  const navLinks = [
    { label: "Início", href: "/", icon: Home },
    { label: "Treinos", href: "/treinos", icon: Dumbbell },
    { label: "Performance", href: "/performance", icon: Activity },
    { label: "Comunidade", href: "/comunidade", icon: Users },
    { label: "Analytics", href: "/analytics", icon: BarChart3 },
    { label: "Perfil", href: "/perfil", icon: User },
  ];

  const adminLinks = [
    { label: "Coach", href: "/coach", icon: Shield },
    { label: "Admin", href: "/admin", icon: Settings },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Top Header para Desktop e Mobile */}
      <header className="border-b border-line bg-surface/80 backdrop-blur-xl supports-[backdrop-filter]:bg-surface/70 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <SelyeLogo height={26} className="text-foreground" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    active
                      ? "bg-foreground text-background font-semibold"
                      : "text-muted hover:text-foreground hover:bg-foreground/5"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.75} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Secondary / Role Links & Actions */}
          <div className="flex items-center gap-2">
            <div className="hidden lg:flex items-center gap-1 border-r border-line pr-2 mr-1">
              {adminLinks.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                      active
                        ? "bg-profundo text-osso"
                        : "text-muted hover:text-foreground hover:bg-foreground/5"
                    }`}
                  >
                    <Icon size={13} strokeWidth={1.75} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <Link
              href="/treinos/novo"
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-md bg-lima text-grafite text-xs font-mono font-bold hover:brightness-95 transition-all shadow-xs"
            >
              <PlusCircle size={15} strokeWidth={2} />
              <span className="hidden xs:inline sm:inline max-sm:sr-only">Nova Ficha</span>
            </Link>

            <div className="flex items-center ml-1">
              <Suspense fallback={<div className="w-8 h-8 rounded-full skeleton" />}>
                <Show when="signed-out">
                  <div className="flex items-center gap-1.5">
                    <SignInButton mode="modal">
                      <button className="px-3 py-1.5 rounded-md border border-line text-xs font-mono font-medium text-foreground hover:bg-foreground/5 transition-colors cursor-pointer">
                        Entrar
                      </button>
                    </SignInButton>
                    <SignUpButton mode="modal">
                      <button className="px-3 py-1.5 rounded-md bg-foreground text-background text-xs font-mono font-bold hover:opacity-90 transition-colors cursor-pointer">
                        Cadastrar
                      </button>
                    </SignUpButton>
                  </div>
                </Show>
                <Show when="signed-in">
                  <UserButton
                    appearance={{
                      elements: {
                        userButtonAvatarBox: "w-8 h-8 rounded-full border border-line",
                      },
                    }}
                  />
                </Show>
              </Suspense>
            </div>
          </div>
        </div>
      </header>

      {/* Bottom Bar para Mobile (§23.1 Mobile-First Navigation) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-xl border-t border-line px-2 pt-1 pb-[max(4px,env(safe-area-inset-bottom))] flex justify-around items-center">
        {navLinks.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col items-center py-1 px-3 rounded text-[10px] font-medium transition-colors ${
                active
                  ? "text-foreground font-bold"
                  : "text-muted hover:text-foreground"
              }`}
            >
              <Icon size={20} strokeWidth={active ? 2.2 : 1.75} />
              <span className="mt-0.5">{item.label}</span>
              {active && <span className="w-1 h-1 rounded-full bg-lima mt-0.5" />}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

