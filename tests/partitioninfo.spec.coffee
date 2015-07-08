m = require('mochainon')
Promise = require('bluebird')
partitioninfo = require('../lib/partitioninfo')
partition = require('../lib/partition')

describe 'Partitioninfo:', ->

	describe '.get()', ->

		describe 'given a valid partition', ->

			beforeEach ->
				@getPartitionFromDefinitionStub = m.sinon.stub(partition, 'getPartitionFromDefinition')
				@getPartitionFromDefinitionStub.returns Promise.resolve
					status: 128
					type: 12
					sectors: 40960
					firstLBA: 8192

			afterEach ->
				@getPartitionFromDefinitionStub.restore()

			it 'should return an information object', ->
				promise = partitioninfo.get('foo/bar.img')
				m.chai.expect(promise).to.eventually.become
					offset: 4194304
					size: 20971520
