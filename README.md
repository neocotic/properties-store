# properties-store

[![Build Status](https://img.shields.io/travis/neocotic/properties-store/develop.svg?style=flat-square)](https://travis-ci.org/neocotic/properties-store)
[![Documentation](https://img.shields.io/badge/docs-online-brightgreen.svg?style=flat-square)](https://github.com/neocotic/properties-store/blob/master/docs/api.md)
[![Coverage](https://img.shields.io/codecov/c/github/neocotic/properties-store/develop.svg?style=flat-square)](https://codecov.io/gh/neocotic/properties-store)
[![Dependency Status](https://img.shields.io/david/neocotic/properties-store.svg?style=flat-square)](https://david-dm.org/neocotic/properties-store)
[![Dev Dependency Status](https://img.shields.io/david/dev/neocotic/properties-store.svg?style=flat-square)](https://david-dm.org/neocotic/properties-store?type=dev)
[![License](https://img.shields.io/npm/l/properties-store.svg?style=flat-square)](https://github.com/neocotic/properties-store/blob/master/LICENSE.md)
[![Release](https://img.shields.io/npm/v/properties-store.svg?style=flat-square)](https://www.npmjs.com/package/properties-store)

[properties-store](https://github.com/neocotic/properties-store) is a Node.js library for working with `.properties`
file stores with an API based closely on that of ECMAScript's `Map`.

* [Install](#install)
* [API](#api)
* [Bugs](#bugs)
* [Contributors](#contributors)
* [License](#license)

## Install

Install using `npm`:

``` bash
$ npm install --save properties-store
```

You'll need to have at least [Node.js](https://nodejs.org) 8 or newer.

## API

    new PropertiesStore([store][, options])

The complete API documentation, along with lots of examples, can be found
[here](https://github.com/neocotic/properties-store/blob/master/docs/api.md).

``` javascript
const properties = new PropertiesStore();
await properties.load(fs.createReadStream('path/to/my.properties'));

properties.set('new-prop', 'Hello, World!');
properties.get('new-prop');
//=> "Hello, World!"

properties.get('missing-prop', 'Some default value');
//=> "Some default value"

await properties.store(fs.createWriteStream('path/to/my.properties'));
```

## Bugs

If you have any problems with this library or would like to see changes currently in development you can do so
[here](https://github.com/neocotic/properties-store/issues).

## Contributors

If you want to contribute, you're a legend! Information on how you can do so can be found in
[CONTRIBUTING.md](https://github.com/neocotic/properties-store/blob/master/CONTRIBUTING.md). We want your suggestions
and pull requests!

A list of contributors can be found in
[AUTHORS.md](https://github.com/neocotic/properties-store/blob/master/AUTHORS.md).

## License

Copyright © 2018 Alasdair Mercer

See [LICENSE.md](https://github.com/neocotic/properties-store/raw/master/LICENSE.md) for more information on our MIT
license.
