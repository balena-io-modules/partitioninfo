m = require('mochainon')
Promise = require('bluebird')
fs = require('fs')

partitioninfo = require('../lib/partitioninfo')
partition = require('../lib/partition')
bootRecord = require('../lib/boot-record')

rpiMBR = fs.readFileSync('./tests/mbr/rpi.data')
bbbMBR = fs.readFileSync('./tests/mbr/bbb.data')

describe 'Partitioninfo:', ->

	describe '.get()', ->

		describe 'given a valid partition', ->

			beforeEach ->
				@bootRecordReadStub = m.sinon.stub(bootRecord, 'read')
				@bootRecordReadStub.returns(Promise.resolve(rpiMBR))

			afterEach ->
				@bootRecordReadStub.restore()

			it 'should return an information object', ->
				promise = partitioninfo.get('mbr/rpi', primary: 1)
				m.chai.expect(promise).to.eventually.become
					offset: 4194304
					size: 20971520
					type: 12

	describe '.getPartitions()', ->

		describe 'given a valid image file', ->

			beforeEach ->
				# Stub bootRecord read method, returning rpi MBR when asked on the first byte
				# but BBB MBR when asked to get the partition table at the offset of the extended partition.
				# We return different partition table there to avoid an infinite loop on getPartitions method.
				@bootRecordReadStub = m.sinon.stub(bootRecord, 'read')
				@bootRecordReadStub.withArgs('mbr/rpi', 0).returns(Promise.resolve(rpiMBR))
				@bootRecordReadStub.withArgs('mbr/rpi', 394264576).returns(Promise.resolve(bbbMBR))

			afterEach ->
				@bootRecordReadStub.restore()

			it 'should return an information object', ->
				promise = partitioninfo.getPartitions('mbr/rpi')
				m.chai.expect(promise).to.eventually.become([
					{
						offset: 4194304
						size: 20971520
						type: 12
					}
					{
						offset: 25165824
						size: 184549376
						type: 131
					}
					{
						offset: 209715200
						size: 184549376
						type: 131
					}
					{
						offset: 394264576
						size: 1086324736
						type: 15
					}
					{
						offset: 398458880
						size: 12582912
						type: 14
					}
					{
						offset: 411041792
						size: 423624704
						type: 131
					}
					{
						offset: 834666496
						size: 4194304
						type: 131
					}
				])
