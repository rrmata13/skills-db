import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FileQuestion } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center gap-3 pt-2">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <FileQuestion className="h-6 w-6 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">Page not found</CardTitle>
          <CardDescription>
            The page you&apos;re looking for doesn&apos;t exist or has been
            moved.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button size="lg" render={<Link href="/">Back to home</Link>} />
          <Button
            size="lg"
            variant="outline"
            render={<Link href="/skills">Browse skills</Link>}
          />
        </CardContent>
      </Card>
    </div>
  );
}
