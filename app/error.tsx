"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, RotateCcw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error for observability. Avoid leaking internals to the UI in prod.
    console.error(error);
  }, [error]);

  const isDev = process.env.NODE_ENV === "development";

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center gap-3 pt-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Something went wrong</CardTitle>
          <CardDescription>
            An unexpected error occurred while loading this page. You can try
            again or head back home.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isDev && error?.message ? (
            <pre className="max-h-40 overflow-auto rounded-md bg-muted px-3 py-2 text-left text-xs text-muted-foreground whitespace-pre-wrap">
              {error.message}
              {error.digest ? `\n\ndigest: ${error.digest}` : ""}
            </pre>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={() => reset()} size="lg">
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
            <Button
              variant="outline"
              size="lg"
              render={<Link href="/">Back to home</Link>}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
