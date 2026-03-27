import { SourceAdapterResult } from "@/types";

export interface SourceAdapter {
  readonly name: string;
  canHandle(sourceUrl: string): boolean;
  fetch(sourceUrl: string, sourceSlug: string): Promise<SourceAdapterResult>;
}
