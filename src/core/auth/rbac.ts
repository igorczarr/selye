/**
 * SELYE — Motor de Controle de Acesso Baseado em Papéis (RBAC - Fase 1)
 * A divisão entre Atleta, Coach e Admin é determinada exclusivamente pela identidade autenticada.
 */

export type UserRole = "athlete" | "coach" | "admin";

const ROLE_WEIGHT: Record<UserRole, number> = {
  athlete: 1,
  coach: 2,
  admin: 3,
};

export const DEFAULT_ADMIN_EMAILS: readonly string[] = [
  "igorsantos979.is@gmail.com",
];

export function isValidRole(value: unknown): value is UserRole {
  return value === "athlete" || value === "coach" || value === "admin";
}

export interface ResolveRoleInput {
  metadataRole?: unknown;
  claimRole?: unknown;
  email?: string | null;
  adminEmails?: readonly string[];
  isRegisteredCoach?: boolean;
}

/**
 * Resolve o papel efetivo do usuário autenticado combinando:
 * 1. Lista de e-mails de administradores globais (founder/admin allowlist)
 * 2. Clerk `publicMetadata.role` ou `sessionClaims.metadata.role`
 * 3. Registro de treinador ativo na tabela `coaches` (quando nenhum papel explícito rebaixou)
 * 4. Padrão seguro: `"athlete"`
 */
export function resolveUserRole(input: ResolveRoleInput): UserRole {
  const normalizedEmail = input.email?.trim().toLowerCase() || "";
  const allowlist = (input.adminEmails ?? DEFAULT_ADMIN_EMAILS).map((e) =>
    e.trim().toLowerCase()
  );

  if (normalizedEmail && allowlist.includes(normalizedEmail)) {
    return "admin";
  }

  if (isValidRole(input.metadataRole)) {
    return input.metadataRole;
  }

  if (isValidRole(input.claimRole)) {
    return input.claimRole;
  }

  if (input.isRegisteredCoach) {
    return "coach";
  }

  return "athlete";
}

/**
 * Verifica se `userRole` possui privilégio suficiente para `requiredRole`.
 * Hierarquia: admin (3) >= coach (2) >= athlete (1)
 */
export function canAccessRole(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  return ROLE_WEIGHT[userRole] >= ROLE_WEIGHT[requiredRole];
}

/**
 * Determina o papel mínimo exigido por uma rota da aplicação.
 */
export function getRequiredRoleForPath(pathname: string): UserRole {
  const clean = pathname.split("?")[0] || "/";
  if (clean === "/admin" || clean.startsWith("/admin/")) {
    return "admin";
  }
  if (clean === "/coach" || clean.startsWith("/coach/")) {
    return "coach";
  }
  return "athlete";
}

/**
 * Verifica se um usuário com `userRole` pode acessar `pathname`.
 */
export function canAccessPath(pathname: string, userRole: UserRole): boolean {
  const required = getRequiredRoleForPath(pathname);
  return canAccessRole(userRole, required);
}
