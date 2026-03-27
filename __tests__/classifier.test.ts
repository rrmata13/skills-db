import { classifyInput } from "@/lib/services/classifier";

describe("classifyInput", () => {
  it("classifies single line as single_task", () => {
    expect(classifyInput("Build a chatbot")).toBe("single_task");
  });

  it("classifies short input as single_task", () => {
    expect(classifyInput("Deploy my app")).toBe("single_task");
  });

  it("classifies bullet list as multi_task", () => {
    const input = `- Build chatbot
- Deploy to cloud`;
    expect(classifyInput(input)).toBe("multi_task");
  });

  it("classifies numbered list with 3+ items as plan", () => {
    const input = `1. Set up infrastructure
2. Build backend
3. Create frontend`;
    expect(classifyInput(input)).toBe("plan");
  });

  it("classifies text with plan keywords as plan", () => {
    const input = `Phase 1: Setup
Phase 2: Development
Phase 3: Deploy by deadline`;
    expect(classifyInput(input)).toBe("plan");
  });

  it("classifies deliverable text as plan", () => {
    const input = `Build and deliver a chatbot platform by end of Q2
- Integrate with Telegram
- Add memory persistence
- Deploy to production`;
    expect(classifyInput(input)).toBe("plan");
  });

  it("classifies multiple lines without markers as multi_task", () => {
    const input = `Build chatbot
Add memory
Set up deployment`;
    expect(classifyInput(input)).toBe("multi_task");
  });
});
