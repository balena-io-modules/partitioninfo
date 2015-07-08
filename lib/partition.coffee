_ = require('lodash')
Promise = require('bluebird')
fs = Promise.promisifyAll(require('fs'))
bootRecord = require('./boot-record')

SECTOR_SIZE = 512

###*
# @summary Get a partition from a boot record
# @protected
# @function
#
# @param {Object} record - boot record
# @param {Number} number - partition number
# @returns {Object} partition
#
# @example
# result = partition.getPartition(mbr, 1)
###
exports.getPartition = (record, number) ->
	result = record.partitions[number - 1]

	if not result?
		throw new Error("Partition not found: #{number}.")

	return result

###*
# @summary Get a partition offset
# @protected
# @function
#
# @param {Object} partition - partition
# @returns {Number} partition offset
#
# @example
# offset = partition.getPartitionOffset(myPartition)
###
exports.getPartitionOffset = (partition) ->
	return partition.firstLBA * SECTOR_SIZE

###*
# @summary Get the partition size in bytes
# @protected
# @function
#
# @param {Object} partition - partition
# @returns {Number} partition size
#
# @example
# size = partition.getPartitionSize(myPartition)
###
exports.getPartitionSize = (partition) ->
	return partition.sectors * SECTOR_SIZE

###*
# @summary Get a partition object from a definition
# @protected
# @function
#
# @param {String} image - image path
# @param {Object} definition - partition definition
# @returns Promise<Object>
#
# @example
# partition.getPartitionFromDefinition 'image.img',
#		primary: 4
#		logical: 1
#	.then (partition) ->
#		console.log(partition)
###
exports.getPartitionFromDefinition = (image, definition) ->
	bootRecord.getMaster(image).then (mbr) ->
		primaryPartition = exports.getPartition(mbr, definition.primary)

		if not definition.logical? or definition.logical is 0
			return primaryPartition

		primaryPartitionOffset = exports.getPartitionOffset(primaryPartition)

		bootRecord.getExtended(image, primaryPartitionOffset).then (ebr) ->

			if not ebr?
				throw new Error("Not an extended partition: #{definition.primary}.")

			logicalPartition = exports.getPartition(ebr, definition.logical)
			logicalPartition.firstLBA += primaryPartition.firstLBA
			return logicalPartition
