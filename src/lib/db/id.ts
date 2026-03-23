export function createId(prefix: string): string {
	if (typeof globalThis.crypto?.randomUUID === "function") {
		return `${prefix}-${globalThis.crypto.randomUUID()}`;
	}

	return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
