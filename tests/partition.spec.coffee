m = require('mochainon')
Promise = require('bluebird')
fs = require('fs')
partition = require('../lib/partition')
bootRecord = require('../lib/boot-record')

# Dumped MBR from real images downloaded from dashboard.resin.io
rpiMBR = fs.readFileSync('./tests/mbr/rpi.data')

describe 'Partition:', ->

	describe '.getPartition()', ->

		describe 'given a record with partitions', ->

			beforeEach ->
				@record =
					partitions: [
						{ info: 'first' }
						{ info: 'second' }
					]

			it 'should retrieve an existing partition', ->
				result = partition.getPartition(@record, 1)
				m.chai.expect(result.info).to.equal('first')

			it 'should throw if partition does not exist', ->
				m.chai.expect =>
					partition.getPartition(@record, 5)
				.to.throw('Partition not found: 5.')

	describe '.getPartitionFromDefinition()', ->

		describe 'given an invalid primary partition', ->

			beforeEach ->
				@bootRecordReadStub = m.sinon.stub(bootRecord, 'read')
				@bootRecordReadStub.withArgs('image', 0).returns(Promise.resolve(rpiMBR))

			afterEach ->
				@bootRecordReadStub.restore()

			it 'should return an error', ->
				promise = partition.getPartitionFromDefinition('image', primary: 5)
				m.chai.expect(promise).to.be.rejectedWith('Partition not found: 5.')

		describe 'given a valid primary partition', ->

			beforeEach ->
				@bootRecordReadStub = m.sinon.stub(bootRecord, 'read')
				@bootRecordReadStub.withArgs('image', 0).returns(Promise.resolve(rpiMBR))

			afterEach ->
				@bootRecordReadStub.restore()

			it 'should return the primary partition if no logical partition', ->
				promise = partition.getPartitionFromDefinition('image', { primary: 1 })
				m.chai.expect(promise).to.eventually.have.property('firstLBA').that.equals(8192)
				m.chai.expect(promise).to.eventually.have.property('sectors').that.equals(40960)

			it 'should return the primary partition if logical partition is zero', ->
				promise = partition.getPartitionFromDefinition('image', { primary: 1, logical: 0 })
				m.chai.expect(promise).to.eventually.have.property('firstLBA').that.equals(8192)
				m.chai.expect(promise).to.eventually.have.property('sectors').that.equals(40960)

			describe 'given partition is not extended', ->

				beforeEach ->
					@bootRecordGetExtendedStub = m.sinon.stub(bootRecord, 'getExtended')
					@bootRecordGetExtendedStub.returns(Promise.resolve(undefined))

				afterEach ->
					@bootRecordGetExtendedStub.restore()

				it 'should return an error', ->
					promise = partition.getPartitionFromDefinition('image', { primary: 1, logical: 2 })
					m.chai.expect(promise).to.be.rejectedWith('Not an extended partition: 1.')

			describe 'given partition is extended', ->

				beforeEach ->
					@bootRecordGetExtendedStub = m.sinon.stub(bootRecord, 'getExtended')
					@bootRecordGetExtendedStub.returns Promise.resolve
						partitions: [
							{ firstLBA: 1024, info: 'third' }
							{ firstLBA: 2048, info: 'fourth' }
						]

				afterEach ->
					@bootRecordGetExtendedStub.restore()

				it 'should return an error if partition was not found', ->
					promise = partition.getPartitionFromDefinition('image', { primary: 1, logical: 3 })
					m.chai.expect(promise).to.be.rejectedWith('Partition not found: 3.')

				it 'should return the logical partition', ->
					promise = partition.getPartitionFromDefinition('image', { primary: 1, logical: 2 })
					m.chai.expect(promise).to.become
						firstLBA: 10240 # rpiMBR extended offset + getExtendedStub offset
						info: 'fourth'
