partitioninfo
-------------

[![npm version](https://badge.fury.io/js/partitioninfo.svg)](http://badge.fury.io/js/partitioninfo)
[![dependencies](https://david-dm.org/jviotti/partitioninfo.png)](https://david-dm.org/jviotti/partitioninfo.png)
[![Build Status](https://travis-ci.org/jviotti/partitioninfo.svg?branch=master)](https://travis-ci.org/jviotti/partitioninfo)
[![Build status](https://ci.appveyor.com/api/projects/status/udif66t2rsxb43xt?svg=true)](https://ci.appveyor.com/project/jviotti/partitioninfo)

Get information about a partition from an image file.

Installation
------------

Install `partitioninfo` by running:

```sh
$ npm install --save partitioninfo
```

Documentation
-------------

<a name="module_partitioninfo.get"></a>
### partitioninfo.get(image, definition) ⇒ <code>Promise.&lt;Object&gt;</code>
**Kind**: static method of <code>[partitioninfo](#module_partitioninfo)</code>  
**Summary**: Get information from a partition  
**Returns**: <code>Promise.&lt;Object&gt;</code> - partition information  
**Access:** public  

| Param | Type | Description |
| --- | --- | --- |
| image | <code>String</code> | image path |
| definition | <code>Object</code> | partition definition |
| definition.primary | <code>Number</code> | primary partition |
| [definition.logical] | <code>Number</code> | logical partition |

**Example**  
```js
partitioninfo.get 'foo/bar.img',
	primary: 4
	logical: 1
.then (information) ->
	console.log(information.offset)
	console.log(information.size)
```

Support
-------

If you're having any problem, please [raise an issue](https://github.com/jviotti/partitioninfo/issues/new) on GitHub and the Resin.io team will be happy to help.

Tests
-----

Run the test suite by doing:

```sh
$ gulp test
```

Contribute
----------

- Issue Tracker: [github.com/jviotti/partitioninfo/issues](https://github.com/jviotti/partitioninfo/issues)
- Source Code: [github.com/jviotti/partitioninfo](https://github.com/jviotti/partitioninfo)

Before submitting a PR, please make sure that you include tests, and that [coffeelint](http://www.coffeelint.org/) runs without any warning:

```sh
$ gulp lint
```

License
-------

The project is licensed under the MIT license.
