export class TokenEstimator {
    // Basic heuristic: 1 token ~= 4 chars for English/Code
    // A more advanced tokenizer (tiktoken/cl100k_base) is overkill for this extension
    // unless we use a WASM binding, which might bloat the extension.
    // For now, char count / 4 is a safe, fast approximation.
    static estimate(content: string): number {
        return Math.ceil(content.length / 4);
    }

    static format(count: number): string {
        if (count < 1000) return `${count} tokens`;
        return `${(count / 1000).toFixed(1)}k tokens`;
    }
}
