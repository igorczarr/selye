import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import {
  getRequiredRoleForPath,
  resolveUserRole,
  canAccessRole,
  isValidRole,
} from "@/core/auth/rbac";

// Rotas públicas que não exigem login
const isPublicRoute = createRouteMatcher([
  "/login(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/api/webhooks(.*)",
  "/icon.svg",
  "/apple-icon.svg",
  "/manifest.webmanifest",
  "/brand(.*)",
]);

export default clerkMiddleware(async (auth, request) => {
  if (!isPublicRoute(request)) {
    const session = await auth();
    if (!session.userId) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect_url", request.url);
      return NextResponse.redirect(loginUrl);
    }

    // Verificação RBAC na borda quando sessionClaims expõe role ou email
    const pathname = request.nextUrl.pathname;
    const requiredRole = getRequiredRoleForPath(pathname);
    if (requiredRole !== "athlete") {
      const claims = (session.sessionClaims || {}) as Record<string, any>;
      const claimRole =
        claims?.metadata?.role ??
        claims?.publicMetadata?.role ??
        claims?.role;
      const claimEmail =
        typeof claims?.email === "string" ? claims.email : null;

      // Se a sessão já traz o claim explícito de role ou email, valida imediatamente na borda.
      // (A validação completa com currentUser() + banco também roda em requireRole() no servidor).
      if (isValidRole(claimRole) || claimEmail) {
        const effectiveRole = resolveUserRole({
          claimRole,
          email: claimEmail,
        });
        if (!canAccessRole(effectiveRole, requiredRole)) {
          return NextResponse.redirect(new URL("/", request.url));
        }
      }
    }
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
