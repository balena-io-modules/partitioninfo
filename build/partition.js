var Promise, SECTOR_SIZE, bootRecord, fs;

Promise = require('bluebird');

fs = Promise.promisifyAll(require('fs'));

bootRecord = require('./boot-record');

SECTOR_SIZE = 512;


/**
 * @summary Get a partition from a boot record
 * @protected
 * @function
 *
 * @param {Object} record - boot record
 * @param {Number} number - partition number
 * @returns {Object} partition
 *
 * @example
 * result = partition.getPartition(mbr, 1)
 */

exports.getPartition = function(record, number) {
  var result;
  result = record.partitions[number - 1];
  if (result == null) {
    throw new Error("Partition not found: " + number + ".");
  }
  return result;
};


/**
 * @summary Get a partition offset
 * @protected
 * @function
 *
 * @param {Object} partition - partition
 * @returns {Number} partition offset
 *
 * @example
 * offset = partition.getPartitionOffset(myPartition)
 */

exports.getPartitionOffset = function(partition) {
  return partition.firstLBA * SECTOR_SIZE;
};


/**
 * @summary Get the partition size in bytes
 * @protected
 * @function
 *
 * @param {Object} partition - partition
 * @returns {Number} partition size
 *
 * @example
 * size = partition.getPartitionSize(myPartition)
 */

exports.getPartitionSize = function(partition) {
  return partition.sectors * SECTOR_SIZE;
};


/**
 * @summary Get a partition object from a definition
 * @protected
 * @function
 *
 * @param {String} image - image path
 * @param {Object} definition - partition definition
 * @returns Promise<Object>
 *
 * @example
 * partition.getPartitionFromDefinition 'image.img',
 *		primary: 4
 *		logical: 1
 *	.then (partition) ->
 *		console.log(partition)
 */

exports.getPartitionFromDefinition = function(image, definition) {
  return bootRecord.getMaster(image).then(function(mbr) {
    var primaryPartition, primaryPartitionOffset;
    primaryPartition = exports.getPartition(mbr, definition.primary);
    if ((definition.logical == null) || definition.logical === 0) {
      return primaryPartition;
    }
    primaryPartitionOffset = exports.getPartitionOffset(primaryPartition);
    return bootRecord.getExtended(image, primaryPartitionOffset).then(function(ebr) {
      var logicalPartition;
      if (ebr == null) {
        throw new Error("Not an extended partition: " + definition.primary + ".");
      }
      logicalPartition = exports.getPartition(ebr, definition.logical);
      logicalPartition.firstLBA += primaryPartition.firstLBA;
      return logicalPartition;
    });
  });
};
