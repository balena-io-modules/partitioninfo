import { using } from 'bluebird';
import { BufferDisk, Disk, FileDisk, openFile } from 'file-disk';
import * as GPT from 'gpt';
import * as MBR from 'mbr';
import { TypedError } from 'typed-error';

/**
 * @module partitioninfo
 */

const MBR_SIZE = 512;
const GPT_SIZE = 512 * 33;

const GPT_PROTECTIVE_MBR = 0xee;

const MBR_LAST_PRIMARY_PARTITION = 4;
const MBR_FIRST_LOGICAL_PARTITION = 5;

export interface MBRPartition {
	offset: number;
	size: number;
	type: number;
	index: number;
}

export interface GPTPartition {
	offset: number;
	size: number;
	type: string;
	index: number;
}

function mbrPartitionDict(
	p: MBR.Partition,
	offset: number,
	index: number,
): MBRPartition {
	return {
		offset: offset + p.byteOffset(),
		size: p.byteSize(),
		type: p.type,
		index,
	};
}

function gptPartitionDict(
	gpt: GPT,
	p: GPT.Partition,
	index: number,
): GPTPartition {
	return {
		offset: p.firstLBA * gpt.blockSize,
		size: (p.lastLBA - p.firstLBA + 1) * gpt.blockSize,
		type: p.type,
		index,
	};
}

// Only for MBR
function getPartitionsFromMBRBuf(buf: Buffer): MBR.Partition[] {
	return new MBR(buf).partitions.filter(p => p.type);
}

async function readFromDisk(
	disk: Disk,
	offset: number,
	size: number,
): Promise<Buffer> {
	const { buffer } = await disk.read(Buffer.alloc(size), 0, size, offset);
	return buffer;
}

// Only for MBR
async function getLogicalPartitions(
	disk: Disk,
	index: number,
	offset: number,
	extendedPartitionOffset?: number,
	limit?: number,
): Promise<MBRPartition[]> {
	if (extendedPartitionOffset === undefined) {
		extendedPartitionOffset = offset;
	}
	if (limit === undefined) {
		limit = Infinity;
	}
	const result: MBRPartition[] = [];
	if (limit <= 0) {
		return result;
	}
	const buf = await readFromDisk(disk, offset, MBR_SIZE);
	for (const p of getPartitionsFromMBRBuf(buf)) {
		if (!p.extended) {
			result.push(mbrPartitionDict(p, offset, index));
		} else if (limit > 0) {
			const logicalPartitions = await getLogicalPartitions(
				disk,
				index + 1,
				extendedPartitionOffset + p.byteOffset(),
				extendedPartitionOffset,
				limit - 1,
			);
			result.push(...logicalPartitions);
			return result;
		}
	}
	return result;
}

export type GetPartitionsResult =
	| { type: 'mbr'; partitions: MBRPartition[] }
	| { type: 'gpt'; partitions: GPTPartition[] };

async function getDiskPartitions(
	disk: Disk,
	{
		offset,
		includeExtended,
		getLogical,
	}: { offset: number; includeExtended: boolean; getLogical: boolean },
): Promise<GetPartitionsResult> {
	let extended = null;
	const mbrBuf = await readFromDisk(disk, offset, MBR_SIZE);
	const partitions = getPartitionsFromMBRBuf(mbrBuf);
	if (partitions.length === 1 && partitions[0].type === GPT_PROTECTIVE_MBR) {
		const gptBuf = await readFromDisk(disk, MBR_SIZE, GPT_SIZE);
		const gpt = GPT.parse(gptBuf);
		return {
			type: 'gpt',
			partitions: gpt.partitions.map((partition, index) =>
				gptPartitionDict(gpt, partition, index + 1),
			),
		};
	} else {
		const mbrPartitions: MBRPartition[] = [];
		for (let index = 0; index < partitions.length; index++) {
			const p = partitions[index];
			if (p.extended) {
				extended = p;
				if (includeExtended) {
					mbrPartitions.push(mbrPartitionDict(p, offset, index + 1));
				}
			} else {
				mbrPartitions.push(mbrPartitionDict(p, offset, index + 1));
			}
		}
		if (extended != null && getLogical) {
			const logicalPartitions = await getLogicalPartitions(
				disk,
				MBR_FIRST_LOGICAL_PARTITION,
				extended.byteOffset(),
			);
			mbrPartitions.push(...logicalPartitions);
		}
		return { type: 'mbr', partitions: mbrPartitions };
	}
}

export class PartitionNotFound extends TypedError {
	constructor(partitionNumber: number) {
		super(`Partition not found: ${partitionNumber}.`);
	}
}

async function getPartition(
	disk: Disk,
	partitionNumber: number,
): Promise<MBRPartition | GPTPartition> {
	if (partitionNumber < 1) {
		throw new Error('The partition number must be at least 1.');
	}
	const info = await getDiskPartitions(disk, {
		includeExtended: true,
		offset: 0,
		getLogical: false,
	});
	if (info.type === 'gpt') {
		if (info.partitions.length < partitionNumber) {
			throw new PartitionNotFound(partitionNumber);
		} else {
			return info.partitions[partitionNumber - 1];
		}
	}
	if (partitionNumber <= MBR_LAST_PRIMARY_PARTITION) {
		if (partitionNumber <= info.partitions.length) {
			return info.partitions[partitionNumber - 1];
		} else {
			throw new PartitionNotFound(partitionNumber);
		}
	}
	const extended = info.partitions.find(p => MBR.Partition.isExtended(p.type));
	if (!extended) {
		throw new PartitionNotFound(partitionNumber);
	} else {
		const logicalPartitionPosition =
			partitionNumber - MBR_FIRST_LOGICAL_PARTITION;
		const logicalPartitions = await getLogicalPartitions(
			disk,
			MBR_FIRST_LOGICAL_PARTITION,
			extended.offset,
			extended.offset,
			logicalPartitionPosition + 1,
		);
		if (logicalPartitionPosition < logicalPartitions.length) {
			return logicalPartitions[logicalPartitionPosition];
		} else {
			throw new PartitionNotFound(partitionNumber);
		}
	}
}

function isString(x: any): x is string {
	return typeof x === 'string';
}

async function callWithDisk<ParameterType, ReturnType>(
	fn: (disk: Disk, arg: ParameterType) => Promise<ReturnType>,
	pathOrBufferOrDisk: string | Buffer | Disk,
	arg: ParameterType,
): Promise<ReturnType> {
	if (isString(pathOrBufferOrDisk)) {
		return await using(openFile(pathOrBufferOrDisk, 'r'), async fd => {
			return await fn(new FileDisk(fd), arg);
		});
	} else if (Buffer.isBuffer(pathOrBufferOrDisk)) {
		return await fn(new BufferDisk(pathOrBufferOrDisk), arg);
	} else {
		return await fn(pathOrBufferOrDisk, arg);
	}
}

/**
 * @summary Get information from a partition
 * @public
 * @function
 *
 * @param {String|Buffer|filedisk.Disk} image - image path or buffer or filedisk.Disk instance
 * @param {Object} number - partition number
 *
 * @returns {Promise<Object>} partition information
 *
 * @example
 * partitioninfo.get('foo/bar.img', 5)
 * .then (information) ->
 * 	console.log(information.offset)
 * 	console.log(information.size)
 * 	console.log(information.type)
 * 	console.log(information.index)
 */

export async function get(
	disk: string | Buffer | Disk,
	partitionNumber: number,
): Promise<MBRPartition | GPTPartition> {
	return await callWithDisk(getPartition, disk, partitionNumber);
}

/**
 * @summary Read all partition tables from a disk image recursively.
 * @public
 * @function
 *
 * @description `getPartitions()` returns an Array.
 * `getPartitions(image)[N - 1]` may not be equal to `get(image, N)`
 * For example on a disk with no primary partitions and one extended partition
 * containing a logical one, `getPartitions(image)` would return an array of 2 partitions
 * (the extended then the logical one), `get(image, 1)` would return the extended
 * partition and `get(image, 5)` would return the logical partition. All other
 * numbers would throw an error.
 * Partition numbers for `get(image, N)` are like Linux's `/dev/sdaN`.
 *
 * The array returned by `getPartitions()` contains primary (or extended) partitions
 * first then the logical ones. This is true even if the extended partition is not the
 * last one of the disk image. Order will always be 1, [2, 3, 4, 5, 6, 7] even if
 * the logical partitions 5, 6 and 7 are physically contained in partiton 1, 2 or 3.
 *
 * @param {String|Buffer|filedisk.Disk} image - image path or buffer or filedisk.Disk instance
 * @param {Object} options
 * @param {Number} [options.offset=0] - where the first partition table will be read from, in bytes
 * @param {Boolean} [options.includeExtended=true] - whether to include extended partitions or not (only for MBR partition tables)
 * @param {Boolean} [options.getLogical=true] - whether to include logical partitions or not (only for MBR partition tables)
 *
 * @throws {Error} if there is no such partition
 *
 * @returns {Promise<Object>} partitions information
 *
 * @example
 * partitioninfo.getPartitions('foo/bar.img')
 * .then (information) ->
 * 	console.log(information.type)
 * 	for partition in information.partitions
 * 		console.log(partition.offset)
 * 		console.log(partition.size)
 * 		console.log(partition.type)
 * 		console.log(partition.index)
 */
export async function getPartitions(
	disk: string | Buffer | Disk,
	{
		offset = 0,
		includeExtended = true,
		getLogical = true,
	}: { offset?: number; includeExtended?: boolean; getLogical?: boolean } = {
		offset: 0,
		includeExtended: true,
		getLogical: true,
	},
): Promise<GetPartitionsResult> {
	return await callWithDisk(getDiskPartitions, disk, {
		offset,
		includeExtended,
		getLogical,
	});
}
