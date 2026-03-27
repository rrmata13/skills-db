import { QueryType } from "@/types";

export function classifyInput(input: string): QueryType {
  const trimmed = input.trim();
  const lines = trimmed.split("\n").filter((l) => l.trim().length > 0);
  const lineCount = lines.length;

  // Check for plan indicators
  const planKeywords =
    /\b(phase|stage|milestone|deliverable|sprint|timeline|deadline|week \d|day \d|step \d|after step|depends on|prerequisite|before|sequentially)\b/i;
  const hasPlanStructure = planKeywords.test(trimmed);

  // Check for numbered steps suggesting a plan
  const numberedLines = lines.filter((l) => /^\s*\d+[.)]\s/.test(l));
  const hasNumberedSteps = numberedLines.length >= 3;

  // Check for bullet points
  const bulletLines = lines.filter((l) => /^\s*[-*+•]\s/.test(l));
  const hasBullets = bulletLines.length >= 2;

  // Check for deliverable language
  const deliverableKeywords =
    /\b(deliver|build|create|develop|implement|ship|launch|release|deploy|produce|complete)\b.*\b(by|before|deadline|end of|within)\b/i;
  const isDeliverable = deliverableKeywords.test(trimmed);

  if (isDeliverable || (hasPlanStructure && lineCount >= 3)) {
    return "plan";
  }

  if (hasNumberedSteps && lineCount >= 3) {
    return "plan";
  }

  if (lineCount >= 2 && (hasBullets || numberedLines.length >= 2)) {
    return "multi_task";
  }

  if (lineCount >= 3) {
    return "multi_task";
  }

  return "single_task";
}
