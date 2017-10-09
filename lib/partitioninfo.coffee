_ = require('lodash')
filedisk = require('file-disk')
MBR = require('mbr')
GPT = require('gpt')
Promise = require('bluebird')

###*
# @module partitioninfo
###

MBR_SIZE = 512
GPT_SIZE = 512 * 33

GPT_PROTECTIVE_MBR = 0xee

MBR_LAST_PRIMARY_PARTITION = 4
MBR_FIRST_LOGICAL_PARTITION = 5
MBR_EXTENDED_PARTITION_TYPE = 5

mbrPartitionDict = (p, offset, index) ->
	{
		offset: offset + p.byteOffset()
		size: p.byteSize()
		type: p.type
		index
	}

gptPartitionDict = (gpt, p, index) ->
	{
		offset: p.firstLBA * gpt.blockSize
		size: (p.lastLBA - p.firstLBA + 1) * gpt.blockSize
		type: p.type.toString()
		index
	}

# Only for MBR
getPartitionsFromMBRBuf = (buf) ->
	(new MBR(buf)).partitions.filter(_.property('type'))

readFromDisk = (disk, offset, size) ->
	buf = Buffer.alloc(size)
	disk.readAsync(buf, 0, size, offset)
	.return(buf)

# Only for MBR
getLogicalPartitions = (disk, index, offset, extendedPartitionOffset = offset, limit = Infinity) ->
	result = []
	if limit <= 0
		return Promise.resolve(result)
	readFromDisk(disk, offset, MBR_SIZE)
	.then (buf) ->
		for p in getPartitionsFromMBRBuf(buf)
			if not MBR.Partition.isExtended(p.type)
				result.push(mbrPartitionDict(p, offset, index))
			else if limit > 0
				logicalPartitionsPromise = getLogicalPartitions(
					disk
					index + 1
					extendedPartitionOffset + p.byteOffset()
					extendedPartitionOffset
					limit - 1
				)
				return logicalPartitionsPromise
				.then (logicalPartitions) ->
					result.push(logicalPartitions...)
					result
		result

getPartitions = (disk, options) ->
	options = _.defaults(options, getLogical: true)
	disk = Promise.promisifyAll(disk)
	result = {}
	extended = null
	readFromDisk(disk, options.offset, MBR_SIZE)
	.then (mbrBuf) ->
		partitions = getPartitionsFromMBRBuf(mbrBuf)
		if partitions.length is 1 and partitions[0].type is GPT_PROTECTIVE_MBR
			result.type = 'gpt'
			return readFromDisk(disk, MBR_SIZE, GPT_SIZE)
			.then (gptBuf) ->
				gpt = GPT.parse(gptBuf)
				result.partitions = gpt.partitions.map (partition, index) ->
					gptPartitionDict(gpt, partition, index + 1)
				result
		else
			result.partitions = []
			result.type = 'mbr'
			for p, index in partitions
				if MBR.Partition.isExtended(p.type)
					extended = p
					if options.includeExtended
						result.partitions.push(mbrPartitionDict(p, options.offset, index + 1))
				else
					result.partitions.push(mbrPartitionDict(p, options.offset, index + 1))
			if extended? and options.getLogical
				return getLogicalPartitions(disk, MBR_FIRST_LOGICAL_PARTITION, extended.byteOffset())
				.then (logicalPartitions) ->
					result.partitions.push(logicalPartitions...)
					result
		result

partitionNotFoundError = (number) ->
	throw new Error("Partition not found: #{number}.")

get = (disk, number) ->
	if number < 1
		throw new Error('The partition number must be at least 1.')
	getPartitions(disk, includeExtended: true, offset: 0, getLogical: false)
	.then (info) ->
		if info.type is 'gpt'
			if info.partitions.length < number
				partitionNotFoundError(number)
			else
				return info.partitions[number - 1]
		if number <= MBR_LAST_PRIMARY_PARTITION
			if number <= info.partitions.length
				info.partitions[number - 1]
			else
				partitionNotFoundError(number)
		else
			extended = _.find(info.partitions, (p) -> p.type is MBR_EXTENDED_PARTITION_TYPE)
			if not extended
				partitionNotFoundError(number)
			else
				logicalPartitionPosition = number - MBR_FIRST_LOGICAL_PARTITION
				getLogicalPartitions(
					disk,
					MBR_FIRST_LOGICAL_PARTITION,
					extended.offset,
					extended.offset,
					logicalPartitionPosition + 1
				)
				.then (logicalPartitions) ->
					if logicalPartitionPosition < logicalPartitions.length
						logicalPartitions[logicalPartitionPosition]
					else
						partitionNotFoundError(number)

callWithDisk = (fn, pathOrDisk, args...) ->
	if _.isString(pathOrDisk)
		Promise.using filedisk.openFile(pathOrDisk, 'r'), (fd) ->
			disk = new filedisk.FileDisk(fd)
			fn(disk, args...)
	else
		fn(pathOrDisk, args...)

###*
# @summary Get information from a partition
# @public
# @function
#
# @param {String|filedisk.Disk} image - image path or filedisk.Disk instance
# @param {Object} number - partition number
#
# @returns {Promise<Object>} partition information
#
# @example
# partitioninfo.get('foo/bar.img', 5)
# .then (information) ->
# 	console.log(information.offset)
# 	console.log(information.size)
# 	console.log(information.type)
# 	console.log(information.index)
###

exports.get = (disk, number) ->
	callWithDisk(get, disk, number)

###*
# @summary Read all partition tables from a disk image recursively.
# @public
# @function
#
# @description `getPartitions()` returns an Array.
# `getPartitions(image)[N - 1]` may not be equal to `get(image, N)`
# For example on a disk with no primary partitions and one extended partition
# containing a logical one, `getPartitions(image)` would return an array of 2 partitions
# (the extended then the logical one), `get(image, 1)` would return the extended
# partition and `get(image, 5)` would return the logical partition. All other
# numbers would throw an error.
# Partition numbers for `get(image, N)` are like Linux's `/dev/sdaN`.
#
# The array returned by `getPartitions()` contains primary (or extended) partitions
# first then the logical ones. This is true even if the extended partition is not the
# last one of the disk image. Order will always be 1, [2, 3, 4, 5, 6, 7] even if
# the logical partitions 5, 6 and 7 are physically contained in partiton 1, 2 or 3.
#
# @param {String|filedisk.Disk} image - image path or filedisk.Disk instance
# @param {Object} options
# @param {Number} [options.offset=0] - where the first partition table will be read from, in bytes
# @param {Boolean} [options.includeExtended=true] - whether to include extended partitions or not (only for MBR partition tables)
# @param {Boolean} [options.getLogical=true] - whether to include logical partitions or not (only for MBR partition tables)
#
# @throws {Error} if there is no such partition
#
# @returns {Promise<Object>} partitions information
#
# @example
# partitioninfo.getPartitions('foo/bar.img')
# .then (information) ->
	console.log(information.type)
# 	for partition in information.partitions
# 		console.log(partition.offset)
# 		console.log(partition.size)
# 		console.log(partition.type)
#		console.log(partition.index)
###
exports.getPartitions = (disk, options) ->
	options = _.defaults(options, includeExtended: true, offset: 0)
	callWithDisk(getPartitions, disk, options)
