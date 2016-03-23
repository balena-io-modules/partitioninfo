m = require('mochainon')
Promise = require('bluebird')
fs = require 'fs'
partitioninfo = require('../lib/partitioninfo')
partition = require('../lib/partition')
bootRecord = require('../lib/boot-record')

rpiMBR = fs.readFileSync('./tests/mbr/rpi.data')

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
