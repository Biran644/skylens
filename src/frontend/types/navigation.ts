export type HypermediaNavLink = {
  rel: string;
  label: string;
  href: string;
  description?: string;
  disabled?: boolean;
};

export type DashboardView =
  | "overview"
  | "data"
  | "map"
  | "mission-control"
  | "timeline";
