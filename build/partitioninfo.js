var BOOT_RECORD_SIZE, MBR, Promise, _, callWithDisk, filedisk, get, getLogicalPartitions, getPartitionFromList, getPartitions, getPartitionsFromMBRBuf, partitionDict, readMbr,
  slice = [].slice;

_ = require('lodash');

filedisk = require('file-disk');

MBR = require('mbr');

Promise = require('bluebird');


/**
 * @module partitioninfo
 */

BOOT_RECORD_SIZE = 512;

partitionDict = function(p, offset) {
  return {
    offset: offset + p.byteOffset(),
    size: p.byteSize(),
    type: p.type
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

getLogicalPartitions = function(disk, offset, extendedPartitionOffset, limit) {
  var result;
  if (extendedPartitionOffset == null) {
    extendedPartitionOffset = offset;
  }
  if (limit == null) {
    limit = 2e308;
  }
  result = [];
  return readMbr(disk, offset).then(function(buf) {
    var i, len, logicalPartitionsPromise, p, ref;
    ref = getPartitionsFromMBRBuf(buf);
    for (i = 0, len = ref.length; i < len; i++) {
      p = ref[i];
      if (!MBR.Partition.isExtended(p.type)) {
        result.push(partitionDict(p, offset));
      } else if (limit > 0) {
        logicalPartitionsPromise = getLogicalPartitions(disk, extendedPartitionOffset + p.byteOffset(), extendedPartitionOffset, limit - 1);
        return logicalPartitionsPromise.then(function(logicalPartitions) {
          result.push.apply(result, logicalPartitions);
          return result;
        });
      }
    }
    return result;
  });
};

getPartitions = function(disk, offset, getLogical) {
  var result;
  if (getLogical == null) {
    getLogical = true;
  }
  disk = Promise.promisifyAll(disk);
  result = [];
  return readMbr(disk, offset).then(function(buf) {
    var i, len, p, ref;
    ref = getPartitionsFromMBRBuf(buf);
    for (i = 0, len = ref.length; i < len; i++) {
      p = ref[i];
      result.push(partitionDict(p, offset));
      if (MBR.Partition.isExtended(p.type) && getLogical) {
        return getLogicalPartitions(disk, p.byteOffset()).then(function(logicalPartitions) {
          result.push.apply(result, logicalPartitions);
          return result;
        });
      }
    }
    return result;
  });
};

getPartitionFromList = function(partitions, number) {
  var partition;
  partition = partitions[number - 1];
  if (!partition) {
    throw new Error("Partition not found: " + number + ".");
  }
  return partition;
};

get = function(disk, definition) {
  return getPartitions(disk, 0, false).then(function(partitions) {
    var primary;
    primary = getPartitionFromList(partitions, definition.primary);
    if (!definition.logical) {
      return primary;
    } else if (!MBR.Partition.isExtended(primary.type)) {
      throw new Error("Not an extended partition: " + definition.primary + ".");
    } else {
      return getLogicalPartitions(disk, primary.offset, primary.offset, definition.logical - 1).then(function(logicalPartitions) {
        return getPartitionFromList(logicalPartitions, definition.logical);
      });
    }
  });
};

callWithDisk = function() {
  var args, fn, pathOrDisk;
  fn = arguments[0], pathOrDisk = arguments[1], args = 3 <= arguments.length ? slice.call(arguments, 2) : [];
  if (pathOrDisk instanceof filedisk.Disk) {
    return fn.apply(null, [pathOrDisk].concat(slice.call(args)));
  } else {
    return Promise.using(filedisk.openFile(pathOrDisk, 'r'), function(fd) {
      var disk;
      disk = new filedisk.FileDisk(fd);
      return fn.apply(null, [disk].concat(slice.call(args)));
    });
  }
};


/**
 * @summary Get information from a partition
 * @public
 * @function
 *
 * @param {String|filedisk.Disk} image - image path or filedisk.Disk instance
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
 * 	console.log(information.type)
 */

exports.get = function(disk, definition) {
  return callWithDisk(get, disk, definition);
};


/**
 * @summary Read all partition tables from a disk image recursively.
 * @public
 * @function
 *
 * @param {String|filedisk.Disk} image - image path or filedisk.Disk instance
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
 * 		console.log(partition.type)
 */

exports.getPartitions = function(disk, offset) {
  if (offset == null) {
    offset = 0;
  }
  return callWithDisk(getPartitions, disk, offset);
};
