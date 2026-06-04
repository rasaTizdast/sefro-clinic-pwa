import type { ReactNode } from "react";

export type SidebarItemGroup = "primary" | "secondary";

export interface SidebarItem {
  label: string;
  icon: ReactNode;
  path: string;
  group?: SidebarItemGroup;
}

export interface SidebarSection {
  group: SidebarItemGroup;
  label: string;
  items: SidebarItem[];
}
