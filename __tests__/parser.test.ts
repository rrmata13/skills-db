import {
  tokenize,
  parseSingleTask,
  parseMultipleTasks,
  parsePlan,
} from "@/lib/services/parser";

describe("tokenize", () => {
  it("lowercases and splits text", () => {
    const tokens = tokenize("Build a chatbot");
    expect(tokens).toContain("build");
    expect(tokens).toContain("chatbot");
  });

  it("removes stop words", () => {
    const tokens = tokenize("I want to build a great chatbot for my team");
    expect(tokens).not.toContain("i");
    expect(tokens).not.toContain("to");
    expect(tokens).not.toContain("a");
    expect(tokens).toContain("build");
    expect(tokens).toContain("great");
    expect(tokens).toContain("chatbot");
    expect(tokens).toContain("team");
  });

  it("removes punctuation", () => {
    const tokens = tokenize("hello, world! how's it going?");
    expect(tokens).toContain("hello");
    expect(tokens).toContain("world");
  });

  it("returns empty for empty input", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("   ")).toEqual([]);
  });
});

describe("parseSingleTask", () => {
  it("parses a single line", () => {
    const tasks = parseSingleTask("Build a chatbot");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].text).toBe("Build a chatbot");
    expect(tasks[0].position).toBe(0);
    expect(tasks[0].predecessors).toEqual([]);
  });

  it("returns empty for empty input", () => {
    expect(parseSingleTask("")).toEqual([]);
    expect(parseSingleTask("   ")).toEqual([]);
  });
});

describe("parseMultipleTasks", () => {
  it("parses bullet list", () => {
    const input = `- Build a chatbot
- Set up CI/CD
- Write documentation`;
    const tasks = parseMultipleTasks(input);
    expect(tasks).toHaveLength(3);
    expect(tasks[0].text).toBe("Build a chatbot");
    expect(tasks[1].text).toBe("Set up CI/CD");
    expect(tasks[2].text).toBe("Write documentation");
  });

  it("parses numbered list", () => {
    const input = `1. Build a chatbot
2. Set up CI/CD
3. Write documentation`;
    const tasks = parseMultipleTasks(input);
    expect(tasks).toHaveLength(3);
    expect(tasks[0].text).toBe("Build a chatbot");
    expect(tasks[1].text).toBe("Set up CI/CD");
  });

  it("assigns sequential predecessors", () => {
    const input = `- Task A
- Task B
- Task C`;
    const tasks = parseMultipleTasks(input);
    expect(tasks[0].predecessors).toEqual([]);
    expect(tasks[1].predecessors).toEqual([0]);
    expect(tasks[2].predecessors).toEqual([1]);
  });

  it("skips short lines", () => {
    const input = `- Build something
- OK
- Another task`;
    const tasks = parseMultipleTasks(input);
    expect(tasks).toHaveLength(2);
  });
});

describe("parsePlan", () => {
  it("parses a multi-step plan", () => {
    const input = `1. Set up infrastructure
2. Build backend API
3. Create frontend UI
4. Write tests
5. Deploy to production`;
    const tasks = parsePlan(input);
    expect(tasks.length).toBeGreaterThanOrEqual(5);
    expect(tasks[0].text).toContain("Set up infrastructure");
  });

  it("strips phase prefixes", () => {
    const input = `Phase 1: Setup
Phase 2: Development
Phase 3: Testing`;
    const tasks = parsePlan(input);
    expect(tasks[0].text).toBe("Setup");
    expect(tasks[1].text).toBe("Development");
  });

  it("handles empty input", () => {
    const tasks = parsePlan("");
    expect(tasks).toEqual([]);
  });
});
