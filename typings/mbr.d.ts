declare module 'mbr' {
	interface CHS {
		cylinder: number;
		head: number;
		sector: number;
	}

	class MBR {
		physicalDrive: number;
		timestamp: {
			seconds: number;
			minutes: number;
			hours: number;
		};
		signature: number;
		copyProtected: boolean;
		partitions: MBR.Partition[];
		code: { offset: number; data: Buffer }[];
		constructor(buffer: Buffer);
	}

	namespace MBR {
		export class Partition {
			status: number;
			type: number;
			sectors: number;
			firstLBA: number;
			firstCHS: CHS;
			lastCHS: CHS;
			extended: boolean;

			byteOffset(blockSize?: number): number;
			byteSize(blockSize?: number): number;

			static isExtended(type: number): boolean;
		}
	}

	export = MBR;
}
