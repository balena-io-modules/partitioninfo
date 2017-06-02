var BOOT_RECORD_SIZE, MasterBootRecord, Promise, filedisk, fs, readFileDisk, readPath;

Promise = require('bluebird');

filedisk = require('file-disk');

fs = Promise.promisifyAll(require('fs'));

MasterBootRecord = require('mbr');

BOOT_RECORD_SIZE = 512;


/**
 * @summary Read the boot record of an image file
 * @protected
 * @function
 *
 * @description It returns a 512 bytes buffer.
 *
 * @param {String|filedisk.Disk} - image path or Disk instance
 * @param {Number=0} position - byte position
 * @returns Promise<Buffer>
 *
 * @example
 *	bootRecord.read('path/to/rpi.img', 0).then (buffer) ->
 *		console.log(buffer)
 */

exports.read = function(image, position) {
  if (position == null) {
    position = 0;
  }
  if (image instanceof filedisk.Disk) {
    return readFileDisk(image, position);
  } else {
    return readPath(image, position);
  }
};

readPath = function(image, position) {
  return Promise.using(filedisk.openFile(image, 'r'), function(fd) {
    return readFileDisk(new filedisk.FileDisk(fd), position);
  });
};

readFileDisk = function(disk, position) {
  var result;
  disk = Promise.promisifyAll(disk);
  result = new Buffer(BOOT_RECORD_SIZE);
  return disk.readAsync(result, 0, BOOT_RECORD_SIZE, position)["return"](result);
};


/**
 * @summary Parse a boot record buffer
 * @protected
 * @function
 *
 * @param {Buffer} buffer - mbr buffer
 * @returns {Object} the parsed mbr
 *
 * @example
 *	bootRecord.read 'path/to/rpi.img', 0, (error, buffer) ->
 *		throw error if error?
 *		parsedBootRecord = bootRecord.parse(buffer)
 *		console.log(parsedBootRecord)
 */

exports.parse = function(mbrBuffer) {
  return new MasterBootRecord(mbrBuffer);
};


/**
 * @summary Get an Extended Boot Record from an offset
 * @protected
 * @function
 *
 * @description Attempts to parse the EBR as well.
 *
 * @param {String} image - image path
 * @param {Number} position - byte position
 * @returns Promise<Object>
 *
 * @example
 *	bootRecord.getExtended('path/to/rpi.img', 2048).then (ebr) ->
 *		console.log(ebr)
 */

exports.getExtended = function(image, position) {
  return exports.read(image, position).then(function(buffer) {
    var result;
    try {
      result = exports.parse(buffer);
    } catch (error) {
      return;
    }
    return result;
  });
};


/**
 * @summary Get the Master Boot Record from an image
 * @protected
 * @function
 *
 * @param {String} image - image path
 * @returns Promise<Object>
 *
 * @example
 *	bootRecord.getMaster('path/to/rpi.img').then (mbr) ->
 *		console.log(mbr)
 */

exports.getMaster = function(image) {
  return exports.read(image, 0).then(exports.parse);
};
