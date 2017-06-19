m = require('mochainon')

partitioninfo = require('../lib/partitioninfo')

DISK_PATH = './tests/mbr/disk.img'

describe 'Partitioninfo:', ->
	describe '.get()', ->
		it 'should return an information object', ->
			promise = partitioninfo.get('./tests/mbr/rpi.data', 1)
			m.chai.expect(promise).to.eventually.become
				offset: 4194304
				size: 20971520
				type: 12

		it 'should be able to get the second logical partition of the extended one', ->
			promise = partitioninfo.get(DISK_PATH, 6)
			m.chai.expect(promise).to.eventually.become
				offset: 3149824
				size: 1024
				type: 131

		it 'should return an error when asked for a non existing partition', ->
			promise = partitioninfo.get(DISK_PATH, 10)
			m.chai.expect(promise).to.be.rejectedWith('Partition not found: 10.')

	describe '.getPartitions()', ->
		it 'should list all partitions of a disk image', ->
			promise = partitioninfo.getPartitions(DISK_PATH)
			m.chai.expect(promise).to.eventually.become([
				{
					offset: 1048576
					size: 1024
					type: 131
				}
				{
					offset: 1049600
					size: 1024
					type: 131
				}
				{
					offset: 1050624
					size: 1024
					type: 131
				}
				{
					offset: 1051648
					size: 4198400
					type: 5
				}
				{
					offset: 2100224
					size: 1024
					type: 131
				}
				{
					offset: 3149824
					size: 1024
					type: 131
				}
				{
					offset: 4199424
					size: 1024
					type: 131
				}
				{
					offset: 5249024
					size: 1024
					type: 131
				}
			])
