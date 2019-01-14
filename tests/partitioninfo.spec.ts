import { promisify } from 'bluebird';
import { assert, expect } from 'chai';
import { readFile } from 'fs';
import 'mocha';

import {
	get,
	getPartitions,
	MBRPartition,
	GPTPartition,
} from '../build/partitioninfo';

const readFileAsync = promisify(readFile);

const GPT_DISK_PATH = './tests/gpt/disk.img';
// 4096 bytes logical sectors
const GPT4096_DISK_PATH = './tests/gpt/disk-4096.img';
const MBR_DISK_PATH = './tests/mbr/disk.img';
const MBR_DISK2_PATH = './tests/mbr/disk2.img';
const RPI_DISK_PATH = './tests/mbr/rpi.data';

const buffers: Map<string, Buffer> = new Map();

async function getBuffer(path: string): Promise<Buffer> {
	let buffer = buffers.get(path);
	if (buffer === undefined) {
		buffer = await readFileAsync(path);
		buffers.set(path, buffer);
	}
	return buffer;
}

async function testGetIt(
	readBufferFirst: boolean,
	path: string,
	partitionNumber: number,
	expected?: MBRPartition | GPTPartition,
): Promise<void> {
	const pathOrBuffer: string | Buffer = readBufferFirst
		? await getBuffer(path)
		: path;
	try {
		const partition = await get(pathOrBuffer, partitionNumber);
		if (expected === undefined) {
			assert.fail();
		} else {
			expect(partition).to.deep.equal(expected);
		}
	} catch (error) {
		if (expected === undefined) {
			expect(error.message).to.deep.equal(
				`Partition not found: ${partitionNumber}.`,
			);
		} else {
			throw error;
		}
	}
}

async function testGetOnPathAndBuffer(
	testTitle: string,
	path: string,
	partitionNumber: number,
	expected?: MBRPartition | GPTPartition,
): Promise<void> {
	it(
		`${testTitle} (path)`,
		testGetIt.bind(null, false, path, partitionNumber, expected),
	);
	it(
		`${testTitle} (Buffer)`,
		testGetIt.bind(null, true, path, partitionNumber, expected),
	);
}

async function testGetPartitionsIt(
	readBufferFirst: boolean,
	path: string,
	options: any,
	expected: MBRPartition[] | GPTPartition[],
): Promise<void> {
	const pathOrBuffer: string | Buffer = readBufferFirst
		? await getBuffer(path)
		: path;
	const info = await getPartitions(pathOrBuffer, options);
	expect(info.partitions).to.deep.equal(expected);
}

async function testGetPartitionsOnPathAndBuffer(
	testTitle: string,
	path: string,
	options: any,
	expected: MBRPartition[] | GPTPartition[],
): Promise<void> {
	it(
		`${testTitle} (path)`,
		testGetPartitionsIt.bind(null, false, path, options, expected),
	);
	it(
		`${testTitle} (Buffer)`,
		testGetPartitionsIt.bind(null, true, path, options, expected),
	);
}
describe('Partitioninfo:', () => {
	describe('.get() mbr disk 1', () => {
		testGetOnPathAndBuffer(
			'should return an information object',
			RPI_DISK_PATH,
			1,
			{ index: 1, offset: 4194304, size: 20971520, type: 12 },
		);

		testGetOnPathAndBuffer(
			'should be able to get the second logical partition of the extended one',
			MBR_DISK_PATH,
			6,
			{ index: 6, offset: 3149824, size: 1024, type: 131 },
		);

		testGetOnPathAndBuffer(
			'should throw an error when asked for a non existing partition',
			MBR_DISK_PATH,
			10,
		);
	});

	describe('.get() gpt disk 1', () => {
		testGetOnPathAndBuffer(
			'should be able to get the sixth partition',
			GPT_DISK_PATH,
			6,
			{
				index: 6,
				offset: 6291456,
				size: 1048576,
				type: '0FC63DAF-8483-4772-8E79-3D69D8477DE4',
			},
		);

		testGetOnPathAndBuffer(
			'should throw an error when asked for a non existing partition',
			GPT_DISK_PATH,
			10,
		);
	});

	describe('.getPartitions() mbr disk 1', () => {
		testGetPartitionsOnPathAndBuffer(
			'should list all partitions of a disk image',
			MBR_DISK_PATH,
			undefined,
			[
				{
					index: 1,
					offset: 1048576,
					size: 1024,
					type: 131,
				},
				{
					index: 2,
					offset: 1049600,
					size: 1024,
					type: 131,
				},
				{
					index: 3,
					offset: 1050624,
					size: 1024,
					type: 131,
				},
				{
					index: 4,
					offset: 1051648,
					size: 4198400,
					type: 5,
				},
				{
					index: 5,
					offset: 2100224,
					size: 1024,
					type: 131,
				},
				{
					index: 6,
					offset: 3149824,
					size: 1024,
					type: 131,
				},
				{
					index: 7,
					offset: 4199424,
					size: 1024,
					type: 131,
				},
				{
					index: 8,
					offset: 5249024,
					size: 1024,
					type: 131,
				},
			],
		);
	});

	describe('.getPartitions() gpt disk 1', () => {
		testGetPartitionsOnPathAndBuffer(
			'should list all partitions of a disk image',
			GPT_DISK_PATH,
			undefined,
			[
				{
					index: 1,
					offset: 1048576,
					size: 1048576,
					type: '0FC63DAF-8483-4772-8E79-3D69D8477DE4',
				},
				{
					index: 2,
					offset: 2097152,
					size: 1048576,
					type: '0FC63DAF-8483-4772-8E79-3D69D8477DE4',
				},
				{
					index: 3,
					offset: 3145728,
					size: 1048576,
					type: '0FC63DAF-8483-4772-8E79-3D69D8477DE4',
				},
				{
					index: 4,
					offset: 4194304,
					size: 1048576,
					type: '0FC63DAF-8483-4772-8E79-3D69D8477DE4',
				},
				{
					index: 5,
					offset: 5242880,
					size: 1048576,
					type: '0FC63DAF-8483-4772-8E79-3D69D8477DE4',
				},
				{
					index: 6,
					offset: 6291456,
					size: 1048576,
					type: '0FC63DAF-8483-4772-8E79-3D69D8477DE4',
				},
				{
					index: 7,
					offset: 7340032,
					size: 1048576,
					type: '0FC63DAF-8483-4772-8E79-3D69D8477DE4',
				},
				{
					index: 8,
					offset: 8388608,
					size: 1048576,
					type: '0FC63DAF-8483-4772-8E79-3D69D8477DE4',
				},
			],
		);
	});

	describe('.getPartitions() mbr disk 1 includeExtended = false', () => {
		testGetPartitionsOnPathAndBuffer(
			'should list all partitions of a disk image except the extended one',
			MBR_DISK_PATH,
			{ includeExtended: false },
			[
				{
					index: 1,
					offset: 1048576,
					size: 1024,
					type: 131,
				},
				{
					index: 2,
					offset: 1049600,
					size: 1024,
					type: 131,
				},
				{
					index: 3,
					offset: 1050624,
					size: 1024,
					type: 131,
				},
				{
					index: 5,
					offset: 2100224,
					size: 1024,
					type: 131,
				},
				{
					index: 6,
					offset: 3149824,
					size: 1024,
					type: 131,
				},
				{
					index: 7,
					offset: 4199424,
					size: 1024,
					type: 131,
				},
				{
					index: 8,
					offset: 5249024,
					size: 1024,
					type: 131,
				},
			],
		);
	});

	describe('.get() mbr disk 2', () => {
		testGetOnPathAndBuffer(
			'should be able to get the first logical partition of the extended one',
			MBR_DISK2_PATH,
			5,
			{ index: 5, offset: 3145728, size: 1048576, type: 131 },
		);

		testGetOnPathAndBuffer(
			'should be able to get the second logical partition of the extended one',
			MBR_DISK2_PATH,
			6,
			{ index: 6, offset: 5242880, size: 1048576, type: 131 },
		);

		testGetOnPathAndBuffer(
			'should return an error when asked for a non existing logical partition',
			MBR_DISK2_PATH,
			10,
		);

		testGetOnPathAndBuffer(
			'should return an error when asked for a non existing primary partition',
			MBR_DISK2_PATH,
			4,
		);
	});

	describe('.getPartitions() mbr disk 2', () => {
		testGetPartitionsOnPathAndBuffer(
			'should list all partitions of a disk image',
			MBR_DISK2_PATH,
			undefined,
			[
				{
					index: 1,
					offset: 1048576,
					size: 1048576,
					type: 131,
				},
				{
					index: 2,
					offset: 2097152,
					size: 7340032,
					type: 5,
				},
				{
					index: 3,
					offset: 9437184,
					size: 1048576,
					type: 131,
				},
				{
					index: 5,
					offset: 3145728,
					size: 1048576,
					type: 131,
				},
				{
					index: 6,
					offset: 5242880,
					size: 1048576,
					type: 131,
				},
				{
					index: 7,
					offset: 7340032,
					size: 1048576,
					type: 131,
				},
			],
		);
	});

	describe('.getPartitions() mbr disk 2 includeExtended = false', () => {
		testGetPartitionsOnPathAndBuffer(
			'should list all partitions of a disk image except the extended one',
			MBR_DISK2_PATH,
			{ includeExtended: false },
			[
				{
					index: 1,
					offset: 1048576,
					size: 1048576,
					type: 131,
				},
				{
					index: 3,
					offset: 9437184,
					size: 1048576,
					type: 131,
				},
				{
					index: 5,
					offset: 3145728,
					size: 1048576,
					type: 131,
				},
				{
					index: 6,
					offset: 5242880,
					size: 1048576,
					type: 131,
				},
				{
					index: 7,
					offset: 7340032,
					size: 1048576,
					type: 131,
				},
			],
		);
	});

	describe('getPartitions on GPT disk with 4096 bytes logical sector size', () => {
		testGetPartitionsOnPathAndBuffer(
			'should list all partitions',
			GPT4096_DISK_PATH,
			{},
			[
				{
					index: 1,
					offset: 131072,
					size: 131072,
					type: '21686148-6449-6E6F-744E-656564454649',
				},
				{
					index: 2,
					offset: 262144,
					size: 655360,
					type: 'C12A7328-F81F-11D2-BA4B-00A0C93EC93B',
				},
				{
					index: 3,
					offset: 917504,
					size: 390656,
					type: 'EBD0A0A2-B9E5-4433-87C0-68B6B72699C7',
				},
			],
		);
	});
});
