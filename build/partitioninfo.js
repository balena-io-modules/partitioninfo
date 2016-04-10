var MBR, Promise, _, bootRecord, getPartitions, partition;

Promise = require('bluebird');

_ = require('lodash');

MBR = require('mbr');

partition = require('./partition');

bootRecord = require('./boot-record');


/**
 * @module partitioninfo
 */


/**
 * @summary Get information from a partition
 * @public
 * @function
 *
 * @param {String} image - image path
 * @param {Object} definition - partition definition
 * @param {Number} definition.primary - primary partition
 * @param {Number} [definition.logical] - logical partition
 *
 * @returns {Promise<Object>} partition information
 *
 * @example
 * partitioninfo.get 'foo/bar.img',
 * 	primary: 4
 * 	logical: 1
 * .then (information) ->
 * 	console.log(information.offset)
 * 	console.log(information.size)
 */

exports.get = function(image, definition) {
  return partition.getPartitionFromDefinition(image, definition).then(function(parsedPartition) {
    return Promise.props({
      offset: parsedPartition.byteOffset(),
      size: parsedPartition.byteSize()
    });
  });
};


/**
 * @summary Read all partition tables from a disk image recursively.
 * @public
 * @function
 *
 * @param {String} image - image path
 * @param {Number} [offset=0] - where the first partition table will be read from, in bytes
 *
 * @returns {Promise<Array<Object>>} partitions information
 *
 * @example
 * partitioninfo.getPartitions('foo/bar.img')
 * .then (information) ->
 * 	for partition in information
 * 		console.log(partition.offset)
 * 		console.log(partition.size)
 */

exports.getPartitions = getPartitions = function(image, offset) {
  if (offset == null) {
    offset = 0;
  }
  return Promise["try"](function() {
    if (offset === 0) {
      return bootRecord.getMaster(image);
    } else {
      return bootRecord.getExtended(image, offset);
    }
  }).get('partitions').filter(_.property('type')).map(function(partition) {
    partition = {
      offset: offset + partition.byteOffset(),
      size: partition.byteSize(),
      type: partition.type
    };
    if (!MBR.Partition.isExtended(partition.type)) {
      return [partition];
    }
    return getPartitions(image, partition.offset).then(function(ps) {
      return [partition].concat(ps);
    });
  }).then(_.flatten);
};
