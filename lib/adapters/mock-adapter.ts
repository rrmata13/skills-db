import { SourceAdapter } from "./types";
import { SourceAdapterResult } from "@/types";
import { ALL_MOCK_DATA } from "@/data/mock-skills";

export class MockAdapter implements SourceAdapter {
  readonly name = "mock";

  canHandle(): boolean {
    return true;
  }

  async fetch(_sourceUrl: string, sourceSlug: string): Promise<SourceAdapterResult> {
    const mockEntry = ALL_MOCK_DATA.find((m) => m.source.slug === sourceSlug);
    if (!mockEntry) {
      throw new Error(`No mock data found for source: ${sourceSlug}`);
    }
    return mockEntry;
  }
}
