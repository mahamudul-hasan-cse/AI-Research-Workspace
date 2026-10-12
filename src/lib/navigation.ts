export type NavItem = {
  href: string;
  label: string;
};

export const navItems: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/workspaces", label: "Workspaces" },
  { href: "/assistant", label: "Assistant" },
  { href: "/sources", label: "Sources" },
  { href: "/saved", label: "Saved" },
  { href: "/history", label: "History" },
  { href: "/settings", label: "Settings" },
  { href: "/health", label: "Health" },
  { href: "/playground", label: "Playground" },
];
