partitioninfo
=============

> Get information about a partition from an image file.

[![npm version](https://badge.fury.io/js/partitioninfo.svg)](http://badge.fury.io/js/partitioninfo)
[![dependencies](https://david-dm.org/resin-io-modules/partitioninfo.svg)](https://david-dm.org/resin-io-modules/partitioninfo.svg)
[![Build Status](https://travis-ci.org/resin-io-modules/partitioninfo.svg?branch=master)](https://travis-ci.org/resin-io-modules/partitioninfo)
[![Build status](https://ci.appveyor.com/api/projects/status/udif66t2rsxb43xt/branch/master?svg=true)](https://ci.appveyor.com/project/resin-io/partitioninfo/branch/master)
[![Gitter](https://badges.gitter.im/Join Chat.svg)](https://gitter.im/resin-io/chat)

Installation
------------

Install `partitioninfo` by running:

```sh
$ npm install --save partitioninfo
```

Documentation
-------------


* [partitioninfo](#module_partitioninfo)
    * [.get(image, number)](#module_partitioninfo.get) ⇒ <code>Promise.&lt;Object&gt;</code>
    * [.getPartitions(image, options)](#module_partitioninfo.getPartitions) ⇒ <code>Promise.&lt;Object&gt;</code>

<a name="module_partitioninfo.get"></a>

### partitioninfo.get(image, number) ⇒ <code>Promise.&lt;Object&gt;</code>
**Kind**: static method of <code>[partitioninfo](#module_partitioninfo)</code>  
**Summary**: Get information from a partition  
**Returns**: <code>Promise.&lt;Object&gt;</code> - partition information  
**Access:** public  

| Param | Type | Description |
| --- | --- | --- |
| image | <code>String</code> &#124; <code>filedisk.Disk</code> | image path or filedisk.Disk instance |
| number | <code>Object</code> | partition number |

**Example**  
```js
partitioninfo.get('foo/bar.img', 5)
.then (information) ->
	console.log(information.offset)
	console.log(information.size)
	console.log(information.type)
	console.log(information.index)
```
<a name="module_partitioninfo.getPartitions"></a>

### partitioninfo.getPartitions(image, options) ⇒ <code>Promise.&lt;Object&gt;</code>
`getPartitions()` returns an Array.
`getPartitions(image)[N - 1]` may not be equal to `get(image, N)`
For example on a disk with no primary partitions and one extended partition
containing a logical one, `getPartitions(image)` would return an array of 2 partitions
(the extended then the logical one), `get(image, 1)` would return the extended
partition and `get(image, 5)` would return the logical partition. All other
numbers would throw an error.
Partition numbers for `get(image, N)` are like Linux's `/dev/sdaN`.

The array returned by `getPartitions()` contains primary (or extended) partitions
first then the logical ones. This is true even if the extended partition is not the
last one of the disk image. Order will always be 1, [2, 3, 4, 5, 6, 7] even if
the logical partitions 5, 6 and 7 are physically contained in partiton 1, 2 or 3.

**Kind**: static method of <code>[partitioninfo](#module_partitioninfo)</code>  
**Summary**: Read all partition tables from a disk image recursively.  
**Returns**: <code>Promise.&lt;Object&gt;</code> - partitions information  
**Throws**:

- <code>Error</code> if there is no such partition

**Access:** public  

| Param | Type | Default | Description |
| --- | --- | --- | --- |
| image | <code>String</code> &#124; <code>filedisk.Disk</code> |  | image path or filedisk.Disk instance |
| options | <code>Object</code> |  |  |
| [options.offset] | <code>Number</code> | <code>0</code> | where the first partition table will be read from, in bytes |
| [options.includeExtended] | <code>Boolean</code> | <code>true</code> | whether to include extended partitions or not (only for MBR partition tables) |
| [options.getLogical] | <code>Boolean</code> | <code>true</code> | whether to include logical partitions or not (only for MBR partition tables) |

**Example**  
```js
partitioninfo.getPartitions('foo/bar.img')
.then (information) ->
	console.log(information.type)
	for partition in information.partitions
		console.log(partition.offset)
		console.log(partition.size)
		console.log(partition.type)
		console.log(partition.index)
```

Support
-------

If you're having any problem, please [raise an issue](https://github.com/resin-io-modules/partitioninfo/issues/new) on GitHub and the Resin.io team will be happy to help.

Tests
-----

Run the test suite by doing:

```sh
$ npm test
```

Contribute
----------

- Issue Tracker: [github.com/resin-io-modules/partitioninfo/issues](https://github.com/resin-io-modules/partitioninfo/issues)
- Source Code: [github.com/resin-io-modules/partitioninfo](https://github.com/resin-io-modules/partitioninfo)

Before submitting a PR, please make sure that you include tests, and that [coffeelint](http://www.coffeelint.org/) runs without any warning:

```sh
$ npm lint
```

License
-------

The project is licensed under the MIT license.
