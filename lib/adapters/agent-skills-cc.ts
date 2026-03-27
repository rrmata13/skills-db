import * as cheerio from "cheerio";
import { SourceAdapter } from "./types";
import { RawSkillData, SourceAdapterResult } from "@/types";
import { SOURCE_REPOSITORIES } from "@/lib/constants";

export class AgentSkillsCCAdapter implements SourceAdapter {
  readonly name = "agent-skills-cc";

  canHandle(sourceUrl: string): boolean {
    return sourceUrl.includes("agent-skills.cc");
  }

  async fetch(sourceUrl: string, sourceSlug: string): Promise<SourceAdapterResult> {
    const response = await fetch(sourceUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${sourceUrl}: ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Extract JSON-LD structured data
    const jsonLd = this.extractJsonLd($);
    // Extract meta tags
    const meta = this.extractMeta($);
    // Extract README from RSC payload
    const readme = this.extractReadme(html);
    // Extract category from breadcrumbs
    const category = this.extractCategory($, html);

    const sourceInfo = SOURCE_REPOSITORIES.find((s) => s.slug === sourceSlug);

    const skill: RawSkillData = {
      name: jsonLd?.name || meta.title || sourceInfo?.name || sourceSlug,
      slug: sourceSlug,
      description:
        jsonLd?.description || meta.description || sourceInfo?.description || "",
      longDescription: readme || undefined,
      rawContent: readme || undefined,
      imageUrl: meta.image || undefined,
      authorName: jsonLd?.authorName || sourceInfo?.author,
      repoUrl: jsonLd?.url || undefined,
      rating: jsonLd?.ratingCount || sourceInfo?.rating || 0,
      categories: category ? [category] : [],
      tags: meta.keywords || [],
      capabilities: [],
    };

    return {
      source: {
        slug: sourceSlug,
        name: sourceInfo?.name || sourceSlug,
        author: sourceInfo?.author || jsonLd?.authorName || "unknown",
        sourceUrl,
        githubUrl: meta.image
          ? `https://github.com/${meta.image.split("github.com/")[1]?.split(".png")[0] || ""}`
          : undefined,
        description: sourceInfo?.description || skill.description,
        rating: skill.rating || 0,
      },
      skills: [skill],
    };
  }

  private extractJsonLd($: cheerio.CheerioAPI): {
    name?: string;
    description?: string;
    url?: string;
    authorName?: string;
    ratingCount?: number;
  } | null {
    try {
      const scripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < scripts.length; i++) {
        const text = $(scripts[i]).html();
        if (!text) continue;
        const data = JSON.parse(text);
        if (data["@type"] === "SoftwareApplication") {
          return {
            name: data.name,
            description: data.description,
            url: data.url,
            authorName: data.author?.name,
            ratingCount: data.aggregateRating?.ratingCount,
          };
        }
      }
    } catch {
      // JSON-LD parsing failed
    }
    return null;
  }

  private extractMeta($: cheerio.CheerioAPI): {
    title?: string;
    description?: string;
    keywords?: string[];
    image?: string;
  } {
    return {
      title:
        $('meta[property="og:title"]').attr("content") || undefined,
      description:
        $('meta[property="og:description"]').attr("content") ||
        $('meta[name="description"]').attr("content") ||
        undefined,
      keywords: ($('meta[name="keywords"]').attr("content") || "")
        .split(",")
        .map((k) => k.trim())
        .filter(Boolean),
      image:
        $('meta[property="og:image"]').attr("content") || undefined,
    };
  }

  private extractReadme(html: string): string | null {
    try {
      // RSC payloads contain README content in __next_f script tags
      const matches = html.match(
        /self\.__next_f\.push\(\[1,"((?:#|\\n#)[\s\S]*?)"\]\)/
      );
      if (matches?.[1]) {
        // Unescape the string
        return matches[1]
          .replace(/\\n/g, "\n")
          .replace(/\\t/g, "\t")
          .replace(/\\"/g, '"')
          .replace(/\\\\/g, "\\")
          .replace(/\\u003c/g, "<")
          .replace(/\\u003e/g, ">")
          .replace(/\\u0026/g, "&");
      }
    } catch {
      // README extraction failed
    }
    return null;
  }

  private extractCategory($: cheerio.CheerioAPI, html: string): string | null {
    try {
      // Try JSON-LD BreadcrumbList
      const scripts = $('script[type="application/ld+json"]');
      for (let i = 0; i < scripts.length; i++) {
        const text = $(scripts[i]).html();
        if (!text) continue;
        const data = JSON.parse(text);
        if (data["@type"] === "BreadcrumbList" && data.itemListElement) {
          // Category is typically the 3rd breadcrumb item
          const categoryItem = data.itemListElement.find(
            (item: { position: number }) => item.position === 3
          );
          if (categoryItem?.name) {
            return categoryItem.name.toLowerCase();
          }
        }
      }
    } catch {
      // Breadcrumb parsing failed
    }

    // Fallback: check URL path or title for category hints
    const titleMatch = html.match(
      /twitter:title[^>]*content="[^"]*-([^-"]+)-Claude Code Skill/
    );
    if (titleMatch?.[1]) {
      return titleMatch[1].trim().toLowerCase();
    }

    return null;
  }
}
