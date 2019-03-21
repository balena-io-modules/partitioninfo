declare module 'gpt' {
	class GPT {
		public blockSize: number;
		public partitions: GPT.Partition[];
	}

	namespace GPT {
		export function parse(buffer: Buffer): GPT;

		export class Partition {
			public type: string;
			public firstLBA: number;
			public lastLBA: number;
			public guid: string;
			public name: string;
		}
	}

	export = GPT;
}
