_ = require('lodash')
filedisk = require('file-disk')
MBR = require('mbr')
Promise = require('bluebird')

###*
# @module partitioninfo
###

BOOT_RECORD_SIZE = 512

partitionDict = (p, offset) ->
	{
		offset: offset + p.byteOffset()
		size: p.byteSize()
		type: p.type
	}

getPartitionsFromMBRBuf = (buf) ->
	(new MBR(buf)).partitions.filter(_.property('type'))

readMbr = (disk, offset) ->
	buf = Buffer.allocUnsafe(BOOT_RECORD_SIZE)
	disk.readAsync(buf, 0, BOOT_RECORD_SIZE, offset).return(buf)

getLogicalPartitions = (disk, offset, extendedPartitionOffset = offset, limit = Infinity) ->
	result = []
	readMbr(disk, offset)
	.then (buf) ->
		for p in getPartitionsFromMBRBuf(buf)
			if not MBR.Partition.isExtended(p.type)
				result.push(partitionDict(p, offset))
			else if limit > 0
				logicalPartitionsPromise = getLogicalPartitions(
					disk
					extendedPartitionOffset + p.byteOffset()
					extendedPartitionOffset
					limit - 1
				)
				return logicalPartitionsPromise
				.then (logicalPartitions) ->
					result.push(logicalPartitions...)
					result
		result

getPartitions = (disk, offset, getLogical = true) ->
	disk = Promise.promisifyAll(disk)
	result = []
	readMbr(disk, offset)
	.then (buf) ->
		for p in getPartitionsFromMBRBuf(buf)
			result.push(partitionDict(p, offset))
			if MBR.Partition.isExtended(p.type) and getLogical
				return getLogicalPartitions(disk, p.byteOffset())
				.then (logicalPartitions) ->
					result.push(logicalPartitions...)
					result
		result

getPartitionFromList = (partitions, number) ->
	partition = partitions[number - 1]
	if not partition
		throw new Error("Partition not found: #{number}.")
	partition

get = (disk, definition) ->
	getPartitions(disk, 0, false)
	.then (partitions) ->
		primary = getPartitionFromList(partitions, definition.primary)
		if not definition.logical
			primary
		else if not MBR.Partition.isExtended(primary.type)
			throw new Error("Not an extended partition: #{definition.primary}.")
		else
			getLogicalPartitions(disk, primary.offset, primary.offset, definition.logical - 1)
			.then (logicalPartitions) ->
				getPartitionFromList(logicalPartitions, definition.logical)

callWithDisk = (fn, pathOrDisk, args...) ->
	if pathOrDisk instanceof filedisk.Disk
		fn(pathOrDisk, args...)
	else
		Promise.using filedisk.openFile(pathOrDisk, 'r'), (fd) ->
			disk = new filedisk.FileDisk(fd)
			fn(disk, args...)

###*
# @summary Get information from a partition
# @public
# @function
#
# @param {String|filedisk.Disk} image - image path or filedisk.Disk instance
# @param {Object} definition - partition definition
# @param {Number} definition.primary - primary partition
# @param {Number} [definition.logical] - logical partition
#
# @returns {Promise<Object>} partition information
#
# @example
# partitioninfo.get 'foo/bar.img',
# 	primary: 4
# 	logical: 1
# .then (information) ->
# 	console.log(information.offset)
# 	console.log(information.size)
# 	console.log(information.type)
###
exports.get = (disk, definition) ->
	callWithDisk(get, disk, definition)

###*
# @summary Read all partition tables from a disk image recursively.
# @public
# @function
#
# @param {String|filedisk.Disk} image - image path or filedisk.Disk instance
# @param {Number} [offset=0] - where the first partition table will be read from, in bytes
#
# @returns {Promise<Array<Object>>} partitions information
#
# @example
# partitioninfo.getPartitions('foo/bar.img')
# .then (information) ->
# 	for partition in information
# 		console.log(partition.offset)
# 		console.log(partition.size)
# 		console.log(partition.type)
###
exports.getPartitions = (disk, offset = 0) ->
	callWithDisk(getPartitions, disk, offset)
