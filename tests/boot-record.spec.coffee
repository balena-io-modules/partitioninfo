m = require('mochainon')
Promise = require('bluebird')
_ = require('lodash')
filedisk = require('file-disk')
fs = Promise.promisifyAll(require('fs'))
tmp = require('tmp')
mockFs = require('mock-fs')
bootRecord = require('../lib/boot-record')

# Dumped MBR from real images downloaded from dashboard.resin.io
rpiMBR = fs.readFileSync('./tests/mbr/rpi.data')
rpi2MBR = fs.readFileSync('./tests/mbr/rpi2.data')
bbbMBR = fs.readFileSync('./tests/mbr/bbb.data')

describe 'Boot Record:', ->

	describe '.read()', ->

		describe 'given a mocked file', ->

			buffer = Buffer.allocUnsafe(1536)
			buffer.fill(1, 0, 512)
			buffer.fill(0, 512)
			expected = buffer.slice(0, 512)

			before ->
				@tmp = tmp.fileSync()
				fs.writeFileAsync(@tmp.name, buffer)

			after (done) ->
				fs.unlink(@tmp.name, done)

			it 'should get the first 512 bytes from the file', ->
				bootRecord.read(@tmp.name)
				.then (data) ->
					m.chai.expect(data).to.deep.equal(expected)

			it 'should get the first 512 bytes from the file (filedisk)', ->
				Promise.using filedisk.openFile(@tmp.name, 'r'), (fd) ->
					disk = new filedisk.FileDisk(fd)
					bootRecord.read(disk)
					.then (data) ->
						m.chai.expect(data).to.deep.equal(expected)

	describe '.parse()', ->

		describe 'given a non valid MBR', ->

			beforeEach ->
				@mbr = new Buffer(512)
				@mbr.fill(0)

			it 'should throw an error', ->
				m.chai.expect =>
					bootRecord.parse(@mbr)
				.to.throw(Error)

		describe 'given a rpi MBR', ->

			beforeEach ->
				@mbr = rpiMBR

			it 'should have a partitions array', ->
				result = bootRecord.parse(@mbr)
				m.chai.expect(_.isArray(result.partitions)).to.be.true

		describe 'given a rpi2 MBR', ->

			beforeEach ->
				@mbr = rpi2MBR

			it 'should have a partitions array', ->
				result = bootRecord.parse(@mbr)
				m.chai.expect(_.isArray(result.partitions)).to.be.true

		describe 'given a bbb MBR', ->

			beforeEach ->
				@mbr = bbbMBR

			it 'should have a partitions array', ->
				result = bootRecord.parse(@mbr)
				m.chai.expect(_.isArray(result.partitions)).to.be.true

	describe '.getExtended()', ->

		describe 'given a non ebr is read', ->

			beforeEach ->
				@bootRecordReadStub = m.sinon.stub(bootRecord, 'read')
				@bootRecordReadStub.returns(Promise.resolve(new Buffer(512)))

			afterEach ->
				@bootRecordReadStub.restore()

			it 'should return undefined', ->
				m.chai.expect(bootRecord.getExtended('image', 512)).to.eventually.equal(undefined)

		describe 'given a valid ebr is read', ->

			beforeEach ->
				@bootRecordReadStub = m.sinon.stub(bootRecord, 'read')
				@bootRecordReadStub.returns(Promise.resolve(rpiMBR))

			afterEach ->
				@bootRecordReadStub.restore()

			it 'should return a parsed boot record', (done) ->
				bootRecord.getExtended('image', 512).then (ebr) ->
					m.chai.expect(ebr).to.exist
					m.chai.expect(ebr.partitions).to.be.an.instanceof(Array)
					done()

		describe 'given there was an error reading the ebr', ->

			beforeEach ->
				@bootRecordReadStub = m.sinon.stub(bootRecord, 'read')
				@bootRecordReadStub.returns(Promise.reject(new Error('read error')))

			afterEach ->
				@bootRecordReadStub.restore()

			it 'should return the error', ->
				m.chai.expect(bootRecord.getExtended('image', 512)).to.be.rejected

	describe '.getMaster()', ->

		describe 'given an invalid mbr is read', ->

			beforeEach ->
				@bootRecordReadStub = m.sinon.stub(bootRecord, 'read')
				@bootRecordReadStub.returns(Promise.resolve(new Buffer(512)))

			afterEach ->
				@bootRecordReadStub.restore()

			it 'should return an error', ->
				m.chai.expect(bootRecord.getMaster('image')).to.be.rejected

		describe 'given a valid mbr is read', ->

			beforeEach ->
				@bootRecordReadStub = m.sinon.stub(bootRecord, 'read')
				@bootRecordReadStub.returns(Promise.resolve(rpiMBR))

			afterEach ->
				@bootRecordReadStub.restore()

			it 'should return a parsed boot record', (done) ->
				bootRecord.getMaster('image').then (mbr) ->
					m.chai.expect(mbr).to.exist
					m.chai.expect(mbr.partitions).to.be.an.instanceof(Array)
					done()

		describe 'given there was an error reading the ebr', ->

			beforeEach ->
				@bootRecordReadStub = m.sinon.stub(bootRecord, 'read')
				@bootRecordReadStub.returns(Promise.reject(new Error('read error')))

			afterEach ->
				@bootRecordReadStub.restore()

			it 'should return the error', ->
				m.chai.expect(bootRecord.getMaster('image')).to.be.rejected
