import { Suspense } from "react";
import { HomeDashboard } from "../frontend/components/HomeDashboard";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm">Loading…</div>}>
      <HomeDashboard />
    </Suspense>
  );
}
