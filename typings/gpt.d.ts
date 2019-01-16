declare module 'gpt' {
	class GPT {
		blockSize: number;
		partitions: GPT.Partition[];
	}

	namespace GPT {
		export function parse(buffer: Buffer): GPT;

		export class Partition {
			type: string;
			firstLBA: number;
			lastLBA: number;
			guid: string;
			name: string;
		}
	}

	export = GPT;
}
