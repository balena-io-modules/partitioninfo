m = require('mochainon')

partitioninfo = require('../lib/partitioninfo')

DISK_PATH = './tests/mbr/disk.img'
DISK2_PATH = './tests/mbr/disk2.img'

describe 'Partitioninfo:', ->
	describe '.get() disk 1', ->
		it 'should return an information object', ->
			promise = partitioninfo.get('./tests/mbr/rpi.data', 1)
			m.chai.expect(promise).to.eventually.become
				index: 1
				offset: 4194304
				size: 20971520
				type: 12

		it 'should be able to get the second logical partition of the extended one', ->
			promise = partitioninfo.get(DISK_PATH, 6)
			m.chai.expect(promise).to.eventually.become
				index: 6
				offset: 3149824
				size: 1024
				type: 131

		it 'should return an error when asked for a non existing partition', ->
			promise = partitioninfo.get(DISK_PATH, 10)
			m.chai.expect(promise).to.be.rejectedWith('Partition not found: 10.')

	describe '.getPartitions() disk 1', ->
		it 'should list all partitions of a disk image', ->
			promise = partitioninfo.getPartitions(DISK_PATH)
			m.chai.expect(promise).to.eventually.become([
				{
					index: 1
					offset: 1048576
					size: 1024
					type: 131
				}
				{
					index: 2
					offset: 1049600
					size: 1024
					type: 131
				}
				{
					index: 3
					offset: 1050624
					size: 1024
					type: 131
				}
				{
					index: 4
					offset: 1051648
					size: 4198400
					type: 5
				}
				{
					index: 5
					offset: 2100224
					size: 1024
					type: 131
				}
				{
					index: 6
					offset: 3149824
					size: 1024
					type: 131
				}
				{
					index: 7
					offset: 4199424
					size: 1024
					type: 131
				}
				{
					index: 8
					offset: 5249024
					size: 1024
					type: 131
				}
			])

	describe '.getPartitions() disk 1 includeExtended = false', ->
		it 'should list all partitions of a disk image except the extended one', ->
			promise = partitioninfo.getPartitions(DISK_PATH, includeExtended: false)
			m.chai.expect(promise).to.eventually.become([
				{
					index: 1
					offset: 1048576
					size: 1024
					type: 131
				}
				{
					index: 2
					offset: 1049600
					size: 1024
					type: 131
				}
				{
					index: 3
					offset: 1050624
					size: 1024
					type: 131
				}
				{
					index: 5
					offset: 2100224
					size: 1024
					type: 131
				}
				{
					index: 6
					offset: 3149824
					size: 1024
					type: 131
				}
				{
					index: 7
					offset: 4199424
					size: 1024
					type: 131
				}
				{
					index: 8
					offset: 5249024
					size: 1024
					type: 131
				}
			])

	describe '.get() disk 2', ->

		it 'should be able to get the first logical partition of the extended one', ->
			promise = partitioninfo.get(DISK2_PATH, 5)
			m.chai.expect(promise).to.eventually.become
				index: 5
				offset: 3145728
				size: 1048576
				type: 131

		it 'should be able to get the second logical partition of the extended one', ->
			promise = partitioninfo.get(DISK2_PATH, 6)
			m.chai.expect(promise).to.eventually.become
				index: 6
				offset: 5242880
				size: 1048576
				type: 131

		it 'should return an error when asked for a non existing logical partition', ->
			promise = partitioninfo.get(DISK2_PATH, 10)
			m.chai.expect(promise).to.be.rejectedWith('Partition not found: 10.')

		it 'should return an error when asked for a non existing primary partition', ->
			promise = partitioninfo.get(DISK2_PATH, 4)
			m.chai.expect(promise).to.be.rejectedWith('Partition not found: 4.')

	describe '.getPartitions() disk 2', ->
		it 'should list all partitions of a disk image', ->
			promise = partitioninfo.getPartitions(DISK2_PATH)
			m.chai.expect(promise).to.eventually.become([
				{
					index: 1
					offset: 1048576
					size: 1048576
					type: 131
				}
				{
					index: 2
					offset: 2097152
					size: 7340032
					type: 5
				}
				{
					index: 3
					offset: 9437184
					size: 1048576
					type: 131
				}
				{
					index: 5
					offset: 3145728
					size: 1048576
					type: 131
				}
				{
					index: 6
					offset: 5242880
					size: 1048576
					type: 131
				}
				{
					index: 7
					offset: 7340032
					size: 1048576
					type: 131
				}
			])

	describe '.getPartitions() disk 2 includeExtended = false', ->
		it 'should list all partitions of a disk image except the extended one', ->
			promise = partitioninfo.getPartitions(DISK2_PATH, includeExtended: false)
			m.chai.expect(promise).to.eventually.become([
				{
					index: 1
					offset: 1048576
					size: 1048576
					type: 131
				}
				{
					index: 3
					offset: 9437184
					size: 1048576
					type: 131
				}
				{
					index: 5
					offset: 3145728
					size: 1048576
					type: 131
				}
				{
					index: 6
					offset: 5242880
					size: 1048576
					type: 131
				}
				{
					index: 7
					offset: 7340032
					size: 1048576
					type: 131
				}
			])
