import { Suspense } from "react";
import { MatchClient } from "./match-client";

export default function MatchPage() {
  return (
    <Suspense fallback={<div className="max-w-3xl mx-auto py-12 text-center text-muted-foreground">Loading...</div>}>
      <MatchClient />
    </Suspense>
  );
}
