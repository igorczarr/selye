export interface NavItem {
  label: string;
  href: string;
  iconName: string;
  badge?: string | number;
}

export const MAIN_NAV_ITEMS: NavItem[] = [
  { label: "Início", href: "/", iconName: "Home" },
  { label: "Treinos", href: "/treinos", iconName: "Dumbbell" },
  { label: "Comunidade", href: "/comunidade", iconName: "Users" },
  { label: "Analytics", href: "/analytics", iconName: "BarChart3" },
  { label: "Perfil", href: "/perfil", iconName: "User" },
];

export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { label: "Painel do Coach", href: "/coach", iconName: "ShieldAlert" },
  { label: "Administração", href: "/admin", iconName: "Settings" },
];
