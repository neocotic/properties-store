# properties-store

[![Build Status](https://img.shields.io/travis/NotNinja/properties-store/develop.svg?style=flat-square)](https://travis-ci.org/NotNinja/properties-store)
[![Documentation](https://img.shields.io/badge/docs-online-brightgreen.svg?style=flat-square)](https://notninja.github.io/properties-store/docs/)
[![Coverage](https://img.shields.io/codecov/c/github/NotNinja/properties-store/develop.svg?style=flat-square)](https://codecov.io/gh/NotNinja/properties-store)
[![Dependency Status](https://img.shields.io/david/NotNinja/properties-store.svg?style=flat-square)](https://david-dm.org/NotNinja/properties-store)
[![Dev Dependency Status](https://img.shields.io/david/dev/NotNinja/properties-store.svg?style=flat-square)](https://david-dm.org/NotNinja/properties-store?type=dev)
[![License](https://img.shields.io/npm/l/properties-store.svg?style=flat-square)](https://github.com/NotNinja/properties-store/blob/master/LICENSE.md)
[![Release](https://img.shields.io/npm/v/properties-store.svg?style=flat-square)](https://www.npmjs.com/package/properties-store)

[properties-store](https://notninja.github.io/properties-store) is a Node.js library for working with `.properties` file
stores while also supporting the ability (via options) to maintain the original source of the file as much as possible,
which can be really useful when merging `.properties` files and wanting to minimizing diffs.

It does not currently support the full syntax for Java `.properties` files (e.g. multiline properties) but this is planned for a future release.

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
[here](https://notninja.github.io/properties-store/docs/).

``` javascript
const fs = require('fs');
const PropertiesStore = require('properties-store');

const properties = new PropertiesStore();

(async() {
  await properties.load(fs.createReadStream('path/to/my.properties'));

  properties.set('new-prop', 'Hello, World!');
  properties.get('new-prop');
  //=> "Hello, World!"

  properties.get('missing-prop', 'Some default value');
  //=> "Some default value"

  await properties.store(fs.createWriteStream('path/to/my.properties'));
})();
```

## Bugs

If you have any problems with this library or would like to see changes currently in development you can do so
[here](https://github.com/NotNinja/properties-store/issues).

## Contributors

If you want to contribute, you're a legend! Information on how you can do so can be found in
[CONTRIBUTING.md](https://github.com/NotNinja/properties-store/blob/master/CONTRIBUTING.md). We want your suggestions
and pull requests!

A list of contributors can be found in
[AUTHORS.md](https://github.com/NotNinja/properties-store/blob/master/AUTHORS.md).

## License

See [LICENSE.md](https://github.com/NotNinja/properties-store/raw/master/LICENSE.md) for more information on our MIT
license.

[![Copyright !ninja](https://cdn.rawgit.com/NotNinja/branding/master/assets/copyright/base/not-ninja-copyright-372x50.png)](https://not.ninja)
