import { assert, expect } from 'chai';
import 'mocha';

import * as partitioninfo from '../build/partitioninfo';

const GPT_DISK_PATH = './tests/gpt/disk.img';
const MBR_DISK_PATH = './tests/mbr/disk.img';
const MBR_DISK2_PATH = './tests/mbr/disk2.img';

describe('Partitioninfo:', () => {
	describe('.get() mbr disk 1', () => {
		it('should return an information object', async () => {
			const partition = await partitioninfo.get('./tests/mbr/rpi.data', 1);
			expect(partition).to.deep.equal({
				index: 1,
				offset: 4194304,
				size: 20971520,
				type: 12,
			});
		});

		it('should be able to get the second logical partition of the extended one', async () => {
			const partition = await partitioninfo.get(MBR_DISK_PATH, 6);
			expect(partition).to.deep.equal({
				index: 6,
				offset: 3149824,
				size: 1024,
				type: 131,
			});
		});

		it('should throw an error when asked for a non existing partition', async () => {
			try {
				await partitioninfo.get(MBR_DISK_PATH, 10);
				assert.fail();
			} catch (error) {
				expect(error.message).to.deep.equal('Partition not found: 10.');
			}
		});
	});

	describe('.get() gpt disk 1', () => {
		it('should be able to get the sixth partition', async () => {
			const partition = await partitioninfo.get(GPT_DISK_PATH, 6);
			expect(partition).to.deep.equal({
				index: 6,
				offset: 6291456,
				size: 1048576,
				type: '0FC63DAF-8483-4772-8E79-3D69D8477DE4',
			});
		});

		it('should throw an error when asked for a non existing partition', async () => {
			try {
				await partitioninfo.get(GPT_DISK_PATH, 10);
				assert.fail();
			} catch (error) {
				expect(error.message).to.deep.equal('Partition not found: 10.');
			}
		});
	});

	describe('.getPartitions() mbr disk 1', () =>
		it('should list all partitions of a disk image', async () => {
			const { partitions } = await partitioninfo.getPartitions(MBR_DISK_PATH);
			expect(partitions).to.deep.equal([
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
			]);
		}));

	describe('.getPartitions() gpt disk 1', () =>
		it('should list all partitions of a disk image', async () => {
			const { partitions } = await partitioninfo.getPartitions(GPT_DISK_PATH);
			expect(partitions).to.deep.equal([
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
			]);
		}));

	describe('.getPartitions() mbr disk 1 includeExtended = false', () =>
		it('should list all partitions of a disk image except the extended one', async () => {
			const { partitions } = await partitioninfo.getPartitions(MBR_DISK_PATH, {
				includeExtended: false,
			});
			expect(partitions).to.deep.equal([
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
			]);
		}));

	describe('.get() mbr disk 2', () => {
		it('should be able to get the first logical partition of the extended one', async () => {
			const partition = await partitioninfo.get(MBR_DISK2_PATH, 5);
			expect(partition).to.deep.equal({
				index: 5,
				offset: 3145728,
				size: 1048576,
				type: 131,
			});
		});

		it('should be able to get the second logical partition of the extended one', async () => {
			const partition = await partitioninfo.get(MBR_DISK2_PATH, 6);
			expect(partition).to.deep.equal({
				index: 6,
				offset: 5242880,
				size: 1048576,
				type: 131,
			});
		});

		it('should return an error when asked for a non existing logical partition', async () => {
			try {
				await partitioninfo.get(MBR_DISK2_PATH, 10);
				assert.fail();
			} catch (error) {
				expect(error.message).to.deep.equal('Partition not found: 10.');
			}
		});

		it('should return an error when asked for a non existing primary partition', async () => {
			try {
				await partitioninfo.get(MBR_DISK2_PATH, 4);
				assert.fail();
			} catch (error) {
				expect(error.message).to.deep.equal('Partition not found: 4.');
			}
		});
	});

	describe('.getPartitions() mbr disk 2', () =>
		it('should list all partitions of a disk image', async () => {
			const { partitions } = await partitioninfo.getPartitions(MBR_DISK2_PATH);
			expect(partitions).to.deep.equal([
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
			]);
		}));

	describe('.getPartitions() mbr disk 2 includeExtended = false', () =>
		it('should list all partitions of a disk image except the extended one', async () => {
			const { partitions } = await partitioninfo.getPartitions(MBR_DISK2_PATH, {
				includeExtended: false,
			});
			expect(partitions).to.deep.equal([
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
			]);
		}));
});
