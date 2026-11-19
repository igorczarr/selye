import { connection } from "next/server";
import { redirect } from "next/navigation";
import { auth, currentUser } from "@clerk/nextjs/server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  type UserRole,
  DEFAULT_ADMIN_EMAILS,
  resolveUserRole,
  canAccessRole,
} from "@/core/auth/rbac";

export interface AuthenticatedRoleContext {
  role: UserRole;
  clerkUserId: string | null;
  email: string | null;
}

function getConfiguredAdminEmails(): string[] {
  const fromEnv = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return Array.from(new Set([...DEFAULT_ADMIN_EMAILS, ...fromEnv]));
}

/**
 * Resolve o papel (`athlete` | `coach` | `admin`) do usuário autenticado no servidor.
 */
export async function getCurrentUserRole(): Promise<AuthenticatedRoleContext> {
  try {
    await connection();
  } catch {
    // Fora de escopo de requisição HTTP Next.js
  }

  let clerkUserId: string | null = null;
  let claimRole: unknown = undefined;
  let metadataRole: unknown = undefined;
  let email: string | null = null;

  try {
    const session = await auth();
    clerkUserId = session.userId ?? null;
    const claims = session.sessionClaims as Record<string, any> | null;
    claimRole =
      claims?.metadata?.role ??
      claims?.publicMetadata?.role ??
      claims?.role;

    const user = await currentUser();
    if (user) {
      metadataRole = user.publicMetadata?.role;
      email = user.emailAddresses?.[0]?.emailAddress ?? null;
    }
  } catch {
    // Ambiente sem contexto Clerk ativo
  }

  // Fallback apenas em desenvolvimento local quando não há sessão Clerk mas ACTIVE_USER_EMAIL está definido
  if (!email && process.env.NODE_ENV !== "production" && process.env.ACTIVE_USER_EMAIL) {
    email = process.env.ACTIVE_USER_EMAIL;
  }

  const adminEmails = getConfiguredAdminEmails();

  // Verificar vínculo na tabela `coaches` caso não haja papel explícito nos metadados
  let isRegisteredCoach = false;
  if (email && !metadataRole && !claimRole) {
    try {
      const [dbUser] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      if (dbUser) {
        const [coachRow] = await db
          .select({ id: schema.coaches.id })
          .from(schema.coaches)
          .where(eq(schema.coaches.userId, dbUser.id))
          .limit(1);
        isRegisteredCoach = Boolean(coachRow);
      }
    } catch {
      // Se banco indisponível, mantém padrão seguro (athlete)
    }
  }

  const role = resolveUserRole({
    metadataRole,
    claimRole,
    email,
    adminEmails,
    isRegisteredCoach,
  });

  return {
    role,
    clerkUserId,
    email,
  };
}

/**
 * Guarda de rota para Server Components / Pages (`/admin`, `/coach`).
 * Redireciona para `/` caso o usuário autenticado não possua o papel exigido.
 */
export async function requireRole(
  requiredRole: UserRole,
  options?: { redirectTo?: string }
): Promise<AuthenticatedRoleContext> {
  const ctx = await getCurrentUserRole();
  if (!canAccessRole(ctx.role, requiredRole)) {
    redirect(options?.redirectTo || "/");
  }
  return ctx;
}

/**
 * Guarda de segurança para Server Actions (`actions/admin.ts`, `actions/coach.ts`).
 * Lança erro 403 caso o usuário não possua o papel exigido.
 */
export async function assertActionRole(
  requiredRole: UserRole
): Promise<AuthenticatedRoleContext> {
  const ctx = await getCurrentUserRole();
  if (!canAccessRole(ctx.role, requiredRole)) {
    throw new Error(
      `Acesso negado (403): esta operação exige privilégio '${requiredRole}'.`
    );
  }
  return ctx;
}
