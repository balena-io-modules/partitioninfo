var BOOT_RECORD_SIZE, MBR, MBR_EXTENDED_PARTITION_TYPE, MBR_FIRST_LOGICAL_PARTITION, MBR_LAST_PRIMARY_PARTITION, Promise, _, callWithDisk, filedisk, get, getLogicalPartitions, getPartitions, getPartitionsFromMBRBuf, partitionDict, partitionNotFoundError, readMbr,
  slice = [].slice;

_ = require('lodash');

filedisk = require('file-disk');

MBR = require('mbr');

Promise = require('bluebird');


/**
 * @module partitioninfo
 */

BOOT_RECORD_SIZE = 512;

MBR_LAST_PRIMARY_PARTITION = 4;

MBR_FIRST_LOGICAL_PARTITION = 5;

MBR_EXTENDED_PARTITION_TYPE = 5;

partitionDict = function(p, offset, index) {
  return {
    offset: offset + p.byteOffset(),
    size: p.byteSize(),
    type: p.type,
    index: index
  };
};

getPartitionsFromMBRBuf = function(buf) {
  return (new MBR(buf)).partitions.filter(_.property('type'));
};

readMbr = function(disk, offset) {
  var buf;
  buf = Buffer.allocUnsafe(BOOT_RECORD_SIZE);
  return disk.readAsync(buf, 0, BOOT_RECORD_SIZE, offset)["return"](buf);
};

getLogicalPartitions = function(disk, index, offset, extendedPartitionOffset, limit) {
  var result;
  if (extendedPartitionOffset == null) {
    extendedPartitionOffset = offset;
  }
  if (limit == null) {
    limit = 2e308;
  }
  result = [];
  if (limit <= 0) {
    return Promise.resolve(result);
  }
  return readMbr(disk, offset).then(function(buf) {
    var i, len, logicalPartitionsPromise, p, ref;
    ref = getPartitionsFromMBRBuf(buf);
    for (i = 0, len = ref.length; i < len; i++) {
      p = ref[i];
      if (!MBR.Partition.isExtended(p.type)) {
        result.push(partitionDict(p, offset, index));
      } else if (limit > 0) {
        logicalPartitionsPromise = getLogicalPartitions(disk, index + 1, extendedPartitionOffset + p.byteOffset(), extendedPartitionOffset, limit - 1);
        return logicalPartitionsPromise.then(function(logicalPartitions) {
          result.push.apply(result, logicalPartitions);
          return result;
        });
      }
    }
    return result;
  });
};

getPartitions = function(disk, options) {
  var extended, result;
  options = _.defaults(options, {
    getLogical: true
  });
  disk = Promise.promisifyAll(disk);
  result = [];
  extended = null;
  return readMbr(disk, options.offset).then(function(buf) {
    var i, index, len, p, ref;
    ref = getPartitionsFromMBRBuf(buf);
    for (index = i = 0, len = ref.length; i < len; index = ++i) {
      p = ref[index];
      if (MBR.Partition.isExtended(p.type)) {
        extended = p;
        if (options.includeExtended) {
          result.push(partitionDict(p, options.offset, index + 1));
        }
      } else {
        result.push(partitionDict(p, options.offset, index + 1));
      }
    }
    if (extended !== null && options.getLogical) {
      return getLogicalPartitions(disk, MBR_FIRST_LOGICAL_PARTITION, extended.byteOffset()).then(function(logicalPartitions) {
        result.push.apply(result, logicalPartitions);
        return result;
      });
    }
    return result;
  });
};

partitionNotFoundError = function(number) {
  throw new Error("Partition not found: " + number + ".");
};

get = function(disk, number) {
  if (number < 1) {
    throw new Error('The partition number must be at least 1.');
  }
  return getPartitions(disk, {
    includeExtended: true,
    offset: 0,
    getLogical: false
  }).then(function(partitions) {
    var extended, logicalPartitionPosition;
    if (number <= MBR_LAST_PRIMARY_PARTITION) {
      if (number <= partitions.length) {
        return partitions[number - 1];
      } else {
        return partitionNotFoundError(number);
      }
    } else {
      extended = _.find(partitions, function(p) {
        return p.type === MBR_EXTENDED_PARTITION_TYPE;
      });
      if (!extended) {
        return partitionNotFoundError(number);
      } else {
        logicalPartitionPosition = number - MBR_FIRST_LOGICAL_PARTITION;
        return getLogicalPartitions(disk, MBR_FIRST_LOGICAL_PARTITION, extended.offset, extended.offset, logicalPartitionPosition + 1).then(function(logicalPartitions) {
          if (logicalPartitionPosition < logicalPartitions.length) {
            return logicalPartitions[logicalPartitionPosition];
          } else {
            return partitionNotFoundError(number);
          }
        });
      }
    }
  });
};

callWithDisk = function() {
  var args, fn, pathOrDisk;
  fn = arguments[0], pathOrDisk = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
  if (_.isString(pathOrDisk)) {
    return Promise.using(filedisk.openFile(pathOrDisk, 'r'), function(fd) {
      var disk;
      disk = new filedisk.FileDisk(fd);
      return fn.apply(null, [disk].concat(slice.call(args)));
    });
  } else {
    return fn.apply(null, [pathOrDisk].concat(slice.call(args)));
  }
};


/**
 * @summary Get information from a partition
 * @public
 * @function
 *
 * @param {String|filedisk.Disk} image - image path or filedisk.Disk instance
 * @param {Object} number - partition number
 *
 * @returns {Promise<Object>} partition information
 *
 * @example
 * partitioninfo.get('foo/bar.img', 5)
 * .then (information) ->
 * 	console.log(information.offset)
 * 	console.log(information.size)
 * 	console.log(information.type)
 * 	console.log(information.index)
 */

exports.get = function(disk, number) {
  return callWithDisk(get, disk, number);
};


/**
 * @summary Read all partition tables from a disk image recursively.
 * @public
 * @function
 *
 * @description `getPartitions()` returns an Array.
 * `getPartitions(image)[N - 1]` may not be equal to `get(image, N)`
 * For example on a disk with no primary partitions and one extended partition
 * containing a logical one, `getPartitions(image)` would return an array of 2 partitions
 * (the extended then the logical one), `get(image, 1)` would return the extended
 * partition and `get(image, 5)` would return the logical partition. All other
 * numbers would throw an error.
 * Partition numbers for `get(image, N)` are like Linux's `/dev/sdaN`.
 *
 * The array returned by `getPartitions()` contains primary (or extended) partitions
 * first then the logical ones. This is true even if the extended partition is not the
 * last one of the disk image. Order will always be 1, [2, 3, 4, 5, 6, 7] even if
 * the logical partitions 5, 6 and 7 are physically contained in partiton 1, 2 or 3.
 *
 * @param {String|filedisk.Disk} image - image path or filedisk.Disk instance
 * @param {Object} options
 * @param {Number} [options.offset=0] - where the first partition table will be read from, in bytes
 * @param {Number} [options.includeExtended=true] - whether to include extended partitions or not
 *
 * @throws {Error} if there is no such partition
 *
 * @returns {Promise<Array<Object>>} partitions information
 *
 * @example
 * partitioninfo.getPartitions('foo/bar.img')
 * .then (information) ->
 * 	for partition in information
 * 		console.log(partition.offset)
 * 		console.log(partition.size)
 * 		console.log(partition.type)
 *		console.log(partition.index)
 */

exports.getPartitions = function(disk, options) {
  options = _.defaults(options, {
    includeExtended: true,
    offset: 0
  });
  return callWithDisk(getPartitions, disk, options);
};
