declare module 'mbr' {
	interface CHS {
		cylinder: number;
		head: number;
		sector: number;
	}

	class MBR {
		public physicalDrive: number;
		public timestamp: {
			seconds: number;
			minutes: number;
			hours: number;
		};
		public signature: number;
		public copyProtected: boolean;
		public partitions: MBR.Partition[];
		public code: Array<{ offset: number; data: Buffer }>;
		constructor(buffer: Buffer);
	}

	namespace MBR {
		export class Partition {
			public status: number;
			public type: number;
			public sectors: number;
			public firstLBA: number;
			public firstCHS: CHS;
			public lastCHS: CHS;
			public extended: boolean;

			public byteOffset(blockSize?: number): number;
			public byteSize(blockSize?: number): number;

			public static isExtended(type: number): boolean;
		}
	}

	export = MBR;
}
