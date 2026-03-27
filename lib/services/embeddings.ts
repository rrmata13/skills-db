import { tokenize } from "./parser";

// TF-IDF Vectorizer for in-memory semantic matching
export class TfIdfVectorizer {
  private vocabulary: Map<string, number> = new Map();
  private idf: Map<string, number> = new Map();
  private documents: string[][] = [];
  private built = false;

  addDocument(text: string) {
    const tokens = tokenize(text);
    this.documents.push(tokens);
    this.built = false;
  }

  build() {
    // Build vocabulary
    const vocabSet = new Set<string>();
    for (const doc of this.documents) {
      for (const token of doc) vocabSet.add(token);
    }
    let idx = 0;
    for (const word of vocabSet) {
      this.vocabulary.set(word, idx++);
    }

    // Compute IDF
    const N = this.documents.length;
    for (const word of vocabSet) {
      const docCount = this.documents.filter((doc) => doc.includes(word)).length;
      this.idf.set(word, Math.log((N + 1) / (docCount + 1)) + 1);
    }

    this.built = true;
  }

  vectorize(text: string): number[] {
    if (!this.built) this.build();

    const tokens = tokenize(text);
    const vector = new Array(this.vocabulary.size).fill(0);

    // Term frequency
    const tf = new Map<string, number>();
    for (const token of tokens) {
      tf.set(token, (tf.get(token) || 0) + 1);
    }

    // TF-IDF
    for (const [word, count] of tf) {
      const vocabIdx = this.vocabulary.get(word);
      if (vocabIdx !== undefined) {
        const idfVal = this.idf.get(word) || 1;
        vector[vocabIdx] = (count / tokens.length) * idfVal;
      }
    }

    return vector;
  }

  cosineSimilarity(a: number[], b: number[]): number {
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
  }
}

// Embedding provider abstraction for future use
export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimension: number;
}

export function getEmbeddingProvider(): EmbeddingProvider | null {
  // Future: check env for configured provider
  // For now, return null (TF-IDF is used instead)
  return null;
}
