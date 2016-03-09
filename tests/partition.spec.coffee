m = require('mochainon')
Promise = require('bluebird')
partition = require('../lib/partition')
bootRecord = require('../lib/boot-record')

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

	describe '.getPartitionOffset()', ->

		it 'should multiply firstLBA with 512', ->
			result = partition.getPartitionOffset(firstLBA: 512)
			m.chai.expect(result).to.equal(262144)

	describe '.getPartitionSize()', ->

		describe 'given a raspberry pi 1 config partition', ->

			beforeEach ->
				@partition =
					sectors: 8192

			it 'should return the correct byte size', ->
				m.chai.expect(partition.getPartitionSize(@partition)).to.equal(4194304)

	describe '.getPartitionFromDefinition()', ->

		describe 'given an invalid primary partition', ->

			beforeEach ->
				@bootRecordGetMasterStub = m.sinon.stub(bootRecord, 'getMaster')
				@bootRecordGetMasterStub.returns Promise.resolve
					partitions: [
						{ firstLBA: 256, info: 'first' }
						{ firstLBA: 512, info: 'second' }
					]

			afterEach ->
				@bootRecordGetMasterStub.restore()

			it 'should return an error', ->
				promise = partition.getPartitionFromDefinition('image', primary: 5)
				m.chai.expect(promise).to.be.rejectedWith('Partition not found: 5.')

		describe 'given a valid primary partition', ->

			beforeEach ->
				@bootRecordGetMasterStub = m.sinon.stub(bootRecord, 'getMaster')
				@bootRecordGetMasterStub.returns Promise.resolve
					partitions: [
						{ firstLBA: 256, info: 'first' }
						{ firstLBA: 512, info: 'second' }
					]

			afterEach ->
				@bootRecordGetMasterStub.restore()

			it 'should return the primary partition if no logical partition', ->
				promise = partition.getPartitionFromDefinition('image', { primary: 1 })
				m.chai.expect(promise).to.become
					firstLBA: 256
					info: 'first'

			it 'should return the primary partition if logical partition is zero', ->
				promise = partition.getPartitionFromDefinition('image', { primary: 1, logical: 0 })
				m.chai.expect(promise).to.become
					firstLBA: 256
					info: 'first'

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
						firstLBA: 2304
						info: 'fourth'
