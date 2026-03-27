import { TfIdfVectorizer } from "@/lib/services/embeddings";

describe("TfIdfVectorizer", () => {
  it("builds vocabulary from documents", () => {
    const vectorizer = new TfIdfVectorizer();
    vectorizer.addDocument("chatbot telegram discord");
    vectorizer.addDocument("deploy cloudflare workers");
    vectorizer.build();

    const v1 = vectorizer.vectorize("chatbot");
    const v2 = vectorizer.vectorize("deploy");
    expect(v1.length).toBe(v2.length);
    expect(v1.length).toBeGreaterThan(0);
  });

  it("returns higher similarity for related texts", () => {
    const vectorizer = new TfIdfVectorizer();
    vectorizer.addDocument("build chatbot telegram messaging");
    vectorizer.addDocument("deploy serverless cloudflare workers");
    vectorizer.addDocument("obsidian notes knowledge management");
    vectorizer.build();

    const query = vectorizer.vectorize("create chatbot messaging");
    const doc1 = vectorizer.vectorize("build chatbot telegram messaging");
    const doc2 = vectorizer.vectorize("deploy serverless cloudflare workers");

    const sim1 = vectorizer.cosineSimilarity(query, doc1);
    const sim2 = vectorizer.cosineSimilarity(query, doc2);

    expect(sim1).toBeGreaterThan(sim2);
  });

  it("returns 0 similarity for unrelated texts", () => {
    const vectorizer = new TfIdfVectorizer();
    vectorizer.addDocument("alpha beta gamma");
    vectorizer.addDocument("delta epsilon zeta");
    vectorizer.build();

    const v1 = vectorizer.vectorize("alpha beta");
    const v2 = vectorizer.vectorize("delta epsilon");
    const sim = vectorizer.cosineSimilarity(v1, v2);
    expect(sim).toBe(0);
  });

  it("handles empty documents", () => {
    const vectorizer = new TfIdfVectorizer();
    vectorizer.addDocument("");
    vectorizer.build();
    const v = vectorizer.vectorize("test");
    expect(v.every((x) => x === 0)).toBe(true);
  });
});

describe("scoring weights", () => {
  it("weights sum to approximately 1", () => {
    const { SCORING_WEIGHTS_NO_SEMANTIC } = require("@/lib/constants");
    const sum = Object.values(SCORING_WEIGHTS_NO_SEMANTIC).reduce(
      (a: number, b: unknown) => a + (b as number),
      0
    );
    expect(sum).toBeCloseTo(1.0, 1);
  });
});
