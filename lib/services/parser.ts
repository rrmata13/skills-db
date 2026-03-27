export interface ParsedTask {
  text: string;
  position: number;
  parentPosition?: number;
  predecessors: number[];
}

const STOP_WORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "i", "we", "you",
  "he", "she", "it", "they", "me", "us", "him", "her", "them", "my",
  "our", "your", "his", "its", "their", "this", "that", "these", "those",
  "and", "but", "or", "nor", "not", "so", "yet", "both", "either",
  "neither", "each", "every", "all", "any", "few", "more", "most",
  "other", "some", "such", "no", "only", "own", "same", "than", "too",
  "very", "just", "because", "as", "until", "while", "of", "at", "by",
  "for", "with", "about", "against", "between", "through", "during",
  "before", "after", "above", "below", "to", "from", "up", "down",
  "in", "out", "on", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "what", "which",
  "who", "whom", "if", "into", "also", "want", "need", "like",
]);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w));
}

export function parseSingleTask(input: string): ParsedTask[] {
  const text = input.trim();
  if (!text) return [];
  return [{ text, position: 0, predecessors: [] }];
}

export function parseMultipleTasks(input: string): ParsedTask[] {
  const lines = input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const tasks: ParsedTask[] = [];
  let position = 0;

  for (const line of lines) {
    // Strip bullet/number prefixes
    const cleaned = line
      .replace(/^[\d]+[.)]\s*/, "")
      .replace(/^[-*+•]\s*/, "")
      .replace(/^\[[ x]]\s*/i, "")
      .trim();

    if (cleaned.length > 2) {
      tasks.push({
        text: cleaned,
        position: position++,
        predecessors: position > 1 ? [position - 2] : [],
      });
    }
  }

  return tasks;
}

export function parsePlan(input: string): ParsedTask[] {
  const lines = input
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const tasks: ParsedTask[] = [];
  let position = 0;
  let currentParent: number | undefined;

  for (const line of lines) {
    // Detect indentation level
    const rawLine = input.split("\n").find((l) => l.trim() === line) || line;
    const indent = rawLine.search(/\S/);
    const isSubtask = indent > 2;

    // Strip prefixes
    const cleaned = line
      .replace(/^[\d]+[.)]\s*/, "")
      .replace(/^[-*+•]\s*/, "")
      .replace(/^\[[ x]]\s*/i, "")
      .replace(/^(phase|step|stage)\s*\d*:?\s*/i, "")
      .trim();

    if (cleaned.length < 3) continue;

    // Skip header-like lines
    if (cleaned.endsWith(":") && cleaned.length < 50) {
      currentParent = position;
      tasks.push({
        text: cleaned.replace(/:$/, ""),
        position: position++,
        predecessors: position > 1 ? [position - 2] : [],
      });
      continue;
    }

    const predecessors: number[] = [];
    if (position > 0) {
      predecessors.push(position - 1);
    }

    // Detect dependency keywords
    const depMatch = cleaned.match(
      /(?:after|requires|depends on|following|once)\s+(?:step|task|phase)?\s*(\d+)/i
    );
    if (depMatch) {
      const depPos = parseInt(depMatch[1]) - 1;
      if (depPos >= 0 && depPos < position && !predecessors.includes(depPos)) {
        predecessors.push(depPos);
      }
    }

    tasks.push({
      text: cleaned,
      position: position++,
      parentPosition: isSubtask ? currentParent : undefined,
      predecessors,
    });

    if (!isSubtask) {
      currentParent = position - 1;
    }
  }

  return tasks;
}
