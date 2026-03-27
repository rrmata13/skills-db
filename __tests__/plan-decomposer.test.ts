import { parsePlan } from "@/lib/services/parser";

describe("Plan Decomposer", () => {
  it("decomposes numbered plan into tasks", () => {
    const plan = `1. Set up project scaffold
2. Create database schema
3. Build API endpoints
4. Implement frontend
5. Write tests`;

    const tasks = parsePlan(plan);
    expect(tasks.length).toBe(5);
    expect(tasks[0].text).toContain("Set up project scaffold");
    expect(tasks[4].text).toContain("Write tests");
  });

  it("detects sequential dependencies", () => {
    const plan = `1. First task
2. Second task
3. Third task`;

    const tasks = parsePlan(plan);
    expect(tasks[0].predecessors).toEqual([]);
    expect(tasks[1].predecessors).toContain(0);
    expect(tasks[2].predecessors).toContain(1);
  });

  it("handles mixed formatting", () => {
    const plan = `Phase 1: Setup
- Install dependencies
- Configure database

Phase 2: Development
- Build API
- Create UI`;

    const tasks = parsePlan(plan);
    expect(tasks.length).toBeGreaterThanOrEqual(4);
  });

  it("handles bullet-point plans", () => {
    const plan = `* Research existing solutions
* Design architecture
* Implement core features
* Test and validate`;

    const tasks = parsePlan(plan);
    expect(tasks.length).toBe(4);
  });

  it("returns empty for empty input", () => {
    expect(parsePlan("")).toEqual([]);
  });

  it("assigns positions sequentially", () => {
    const plan = `1. Task A
2. Task B
3. Task C`;

    const tasks = parsePlan(plan);
    expect(tasks.map((t) => t.position)).toEqual([0, 1, 2]);
  });
});
