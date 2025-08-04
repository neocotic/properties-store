# properties-store

[![Build Status](https://img.shields.io/github/actions/workflow/status/neocotic/properties-store/ci.yml?event=push&style=for-the-badge)](https://github.com/neocotic/properties-store/actions/workflows/ci.yml)
[![Downloads](https://img.shields.io/npm/dw/properties-store?style=for-the-badge)](https://github.com/neocotic/properties-store)
[![Release](https://img.shields.io/npm/v/properties-store?style=for-the-badge)](https://github.com/neocotic/properties-store)
[![License](https://img.shields.io/github/license/neocotic/properties-store?style=for-the-badge)](https://github.com/neocotic/properties-store/blob/main/LICENSE.md)

[properties-store](https://github.com/neocotic/properties-store) is a [Node.js](https://nodejs.org) library for working
with `.properties` file stores with an API based closely on that of ECMAScript's `Map`.

## Install

Install using [npm](https://npmjs.com):

``` sh
npm install --save properties-store
```

## Usage

### `PropertiesStore.load(input[, options])`

Reads the property information from the `input` stream provided and loads it into a new `PropertiesStore`.

If multiple lines are found for the same key in `input`, the value of the last line with that key will be used.

Any Unicode escapes ("\uxxxx" notation) read from input will be converted to their corresponding Unicode characters.

##### Options

| Option     | Type     | Default    | Description                                          |
|------------|----------|------------|------------------------------------------------------|
| `encoding` | `string` | `"latin1"` | The character encoding to be used to read the input. |

#### Examples

``` javascript
import { createReadStream } from "node:fs";
import { PropertiesStore } from "properties-store";

const properties = await PropertiesStore.load(createReadStream("/path/to/my.properties"), { encoding: "utf8" });
properties.get("foo");
//=> "bar"
Array.from(properties);
//=> [["foo", "bar"], ["fu", "baz"]]
```

### `PropertiesStore([iterable])`

Creates an instance of `PropertiesStore`.

Optionally, an `iterable` can be specified containing key/value pairs to be used as the initial properties for the
created `PropertiesStore` instance. This can be another instance of `PropertiesStore` or a simple 2D string array, for
example.

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const original = new PropertiesStore([
  ["foo", "bar"],
  ["fu", "baz"],
]);
const copy = new PropertiesStore(original);

Array.from(copy);
//=> [["foo", "bar"], ["fu", "baz"]]
```

### `PropertiesStore#clear()`

Removes all properties from the `PropertiesStore`.

This method will trigger the following event(s):

- `clear` after all properties have been removed
- `delete` for each property that has been removed

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([
  ["foo", "bar"],
  ["fu", "baz"],
]);

properties.clear();
properties.size;
//=> 0
```

### `PropertiesStore#delete(key)`

Removes the property with the specified `key` from the `PropertiesStore`.

`key` is case-sensitive. Alternatively, `key` can be a regular expression that can be used to delete any properties with
a matching key. It's important to note that using a regular expression is slower than using an exact string as the
former requires all properties to be iterated over and checked while the latter has the performance of a hash lookup.

This method will trigger the following event(s):

- `delete` for each property that is removed

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([
  ["foo", "bar"],
  ["fu", "baz"],
  ["fizz", "buzz"],
]);

properties.delete("FOO");
properties.has("foo");
//=> true

properties.delete("foo");
properties.has("foo");
//=> false

properties.delete(/^f(u|izz)$/);
properties.has("fu");
//=> false
properties.has("fizz");
//=> false
```

### `PropertiesStore#entries()`

Returns an iterator containing the key/value pairs for each property in the `PropertiesStore`.

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([
  ["foo", "bar"],
  ["fu", "baz"],
]);

Array.from(properties.entries());
//=> [["foo", "bar"], ["fu", "baz"]]
```

### `PropertiesStore#forEach(callback[, thisArg])`

Invokes the specified `callback` function once per each property in the `PropertiesStore`.

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([
  ["foo", "bar"],
  ["fu", "baz"],
]);

properties.forEach((value, key) => console.log(`${key}=${value}`));
//=> "foo=bar"
//=> "fu=baz"
```

### `PropertiesStore#get(key[, defaultValue])`

Returns the value of the property with the specified `key` in the `PropertiesStore`.

`key` is case-sensitive.

If no property is found matching `key`, `defaultValue` will be returned.

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([["foo", "bar"]]);

properties.get("foo");
//=> "bar"
properties.get("FOO");
//=> undefined
properties.get("fu");
//=> undefined
properties.get("fu", undefined);
//=> undefined
properties.get("fu", "baz");
//=> "baz"
```

### `PropertiesStore#has(key)`

Returns whether a property with the specified `key` exists within the `PropertiesStore`.

`key` is case-sensitive. Alternatively, `key` can be a regular expression that can be used to check for the existence of
any property with a matching key. It's important to note that using a regular expression is slower than using an exact
string as the former requires all properties - up to and including the first matching property - to be iterated over and
checked while the latter has the performance of a hash lookup.

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([["foo", "bar"]]);

properties.has("foo");
//=> true
properties.has("FOO");
//=> false
properties.has("fu");
//=> false

properties.has(/^f/);
//=> true
properties.has(/^ba/);
//=> false
```

### `PropertiesStore#keys()`

Returns an iterator containing the keys for each property in the `PropertiesStore`.

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([
  ["foo", "bar"],
  ["fu", "baz"],
]);

Array.from(properties.keys());
//=> ["foo", "fu"]
```

### `PropertiesStore#load(input[, options])`

Reads the property information from the `input` stream provided and loads it into the `PropertiesStore`.

If multiple lines are found for the same key in `input`, the value of the last line with that key will be used.

Any Unicode escapes ("\uxxxx" notation) read from input will be converted to their corresponding Unicode characters.

This method will trigger the following event(s):

- `change` if a property is created/changed
- `error` if an error occurs while reading properties from `input`
- `load` once all properties have been read from `input`

#### Options

| Option     | Type     | Default    | Description                                          |
|------------|----------|------------|------------------------------------------------------|
| `encoding` | `string` | `"latin1"` | The character encoding to be used to read the input. |

#### Examples

``` javascript
import { createReadStream } from "node:fs";
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore()

await properties.load(createReadStream("/path/to/my.properties"), { encoding: "utf8" });
properties.get("foo");
//=> "bar"
Array.from(properties);
//=> [["foo", "bar"], ["fu", "baz"]]
```

### `PropertiesStore#replace(regexp, callback[, thisArg])`

Replaces the value of each property whose key matches the specified regular expression in the `PropertiesStore`,
invoking the `callback` provided to determine the replacement value for each matching property.

This method will trigger the following event(s):

- `change` if a property is changed

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([
  ["foo", "bar"],
  ["fu", "baz"],
  ["fizz", "buzz"],
]);

properties.replace(/quux/, () => "foo");
Array.from(properties);
//=> [["foo", "bar"], ["fu", "baz"], ["fizz", "buzz"]]

properties.replace(/^f\S{2,3}$/, (value) => value.toUpperCase());
Array.from(properties);
//=> [["foo", "BAR"], ["fu", "baz"], ["fizz", "BUZZ"]]
```

### `PropertiesStore#search(regexp)`

Searches for matches between the specified regular expression and the keys within the `PropertiesStore`, returning a
generator containing the key/value pairs for each matching property.

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([
  ["foo", "bar"],
  ["fu", "baz"],
]);

Array.from(properties.search(/^ba/));
=> []
Array.from(properties.search(/^f/));
//=> [["foo", "bar"], ["fu", "baz"]]
```

### `PropertiesStore#set(key, value)`

Sets the value of the property in the `PropertiesStore` with the specified `key` to `value`.

`key` is case-sensitive.

This method will trigger the following event(s):

- `change` if a property is created/changed

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore();

properties
  .set("foo", "bar")
  .set("fu", "baz");
Array.from(properties);
//=> [["foo", "bar"], ["fu", "baz"]]

properties.set("FOO", "BAR");
Array.from(properties);
//=> [["foo", "bar"], ["fu", "baz"], ["FOO", "BAR"]]

properties.set("foo", "BAR");
Array.from(properties);
//=> [["foo", "BAR"], ["fu", "baz"], ["FOO", "BAR"]]
```

### `PropertiesStore#store(output[, options])`

Writes the property information within the `PropertiesStore` to the `output` stream provided.

By default, any characters that are not part of the ASCII character set will be converted to Unicode escapes ("\uxxxx"
notation) before being written to `output`. This behavior can be prevented by setting the `disableUnicodeEscape` option
to `true`.

This method will trigger the following event(s):

- `error` if an error occurs while writing properties to `output`
- `store` once all properties have been written to `output`

#### Options

| Option                 | Type                  | Default    | Description                                                                                           |
|------------------------|-----------------------|------------|-------------------------------------------------------------------------------------------------------|
| `comments`             | `string \| undefined` | *None*     | Any comments to be written to the output before the properties.                                       |
| `disableTimestamp`     | `boolean`             | `false`    | Whether to disable writing a timestamp to the output.                                                 |
| `disableUnicodeEscape` | `boolean`             | `false`    | Whether to disable the conversion of all non-ASCII characters to Unicode escapes ("\uxxxx" notation). |
| `encoding`             | `string`              | `"latin1"` | The character encoding to be used to write the output.                                                |

#### Examples

``` javascript
import { createWriteStream, readFileSync } from "node:fs";
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([
  ["foo", "bàr"],
  ["fu", "bàz"],
]);

await properties.store(createWriteStream("/path/to/my.properties"));
readFileSync("/path/to/my.properties", "latin1");
//=> `# Mon Oct 31 21:05:00 GMT 2016
//=> foo=b\\u00e0r
//=> fu=b\\u00e0z
//=> `

await properties.store(createWriteStream("/path/to/my.properties"), {
  comments: "Some witty comment",
  disableUnicodeEscape: true,
  encoding: "utf8",
});
readFileSync("/path/to/my.properties", "utf8");
//=> `# Some witty comment
//=> # Mon Oct 31 21:05:00 GMT 2016
//=> foo=bàr
//=> fu=bàz
//=> `
```

### `PropertiesStore#values()`

Returns an iterator containing the values for each property in the `PropertiesStore`.

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([
  ["foo", "bar"],
  ["fu", "baz"],
]);

Array.from(properties.values());
//=> ["bar", "baz"]
```

### `PropertiesStore#[Symbol.iterator]`

Returns an iterator containing the key/value pairs for each property in the `PropertiesStore`.

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore([
  ["foo", "bar"],
  ["fu", "baz"],
]);

Array.from(properties.entries());
//=> [["foo", "bar"], ["fu", "baz"]]
```

### `PropertiesStore#size`

The number of properties in the `PropertiesStore`.

#### Examples

``` javascript
import { PropertiesStore } from "properties-store";

const properties = new PropertiesStore();
properties.size;
//=> 0

properties.set("foo", "bar");
properties.set("fu", "baz");
properties.set("fu", "BAZ");

properties.size;
//=> 2
```

## Related

* [escape-unicode](https://github.com/neocotic/escape-unicode)
* [node-native2ascii](https://github.com/neocotic/node-native2ascii)
* [unescape-unicode](https://github.com/neocotic/unescape-unicode)

## Bugs

If you have any problems with this package or would like to see changes currently in development, you can do so
[here](https://github.com/neocotic/properties-store/issues).

## Contributors

If you want to contribute, you're a legend! Information on how you can do so can be found in
[CONTRIBUTING.md](https://github.com/neocotic/properties-store/blob/main/CONTRIBUTING.md). We want your suggestions and
pull requests!

A list of all contributors can be found in
[AUTHORS.md](https://github.com/neocotic/properties-store/blob/main/AUTHORS.md).

## License

Copyright © 2025 neocotic

See [LICENSE.md](https://github.com/neocotic/properties-store/raw/main/LICENSE.md) for more information on our MIT
license.
