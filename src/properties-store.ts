/*
 * Copyright (C) 2025 neocotic
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { EventEmitter } from "node:events";
import { PropertiesReader } from "./properties-reader.js";
import { PropertiesWriter } from "./properties-writer.js";

/**
 * The options that can be provided to {@link PropertiesStore#load} or {@link PropertiesStore.load}.
 */
export interface PropertiesStoreLoadOptions {
  /**
   * The character encoding to be used to read the input.
   *
   * If not specified, `latin1` encoding will be used.
   */
  encoding?: NodeJS.BufferEncoding;
}

/**
 * The callback function that is passed to {@link PropertiesStore#forEach}.
 *
 * @param value The property value.
 * @param key The property key.
 * @param properties The instance of {@link PropertiesStore}.
 */
export type PropertiesStoreForEachCallback = (
  value: string,
  key: string,
  properties: PropertiesStore,
) => void;

/**
 * The callback function that is passed to {@link PropertiesStore#replace}.
 *
 * @param value The property value.
 * @param key The property key.
 * @param properties The instance of {@link PropertiesStore}.
 * @return The replacement value for the property.
 */
export type PropertiesStoreReplaceCallback = (
  value: string,
  key: string,
  properties: PropertiesStore,
) => string;

/**
 * The options that can be provided to {@link PropertiesStore#store}.
 */
export interface PropertiesStoreStoreOptions {
  /**
   * Any comments to be written to the output before the properties.
   *
   * If not specified, no comments will be written
   */
  comments?: string;
  /**
   * Whether to disable writing a timestamp to the output.
   *
   * If enabled, the timestamp is written after any {@link #comments} and before the properties.
   *
   * If not specified, a timestamp will be written.
   */
  disableTimestamp?: boolean;
  /**
   * Whether to disable the conversion of all non-ASCII characters to Unicode escapes ("\uxxxx" notation).
   *
   * If not specified, all non-ASCII characters will be escaped.
   */
  disableUnicodeEscape?: boolean;
  /**
   * The character encoding to be used to write the output.
   *
   * If not specified, `latin1` encoding will be used.
   */
  encoding?: NodeJS.BufferEncoding;
}

/**
 * Represents a persistent set of properties which can be loaded from and/or saved to a stream. Each property key and
 * their corresponding value is a string that can be iterated over as `PropertiesStore` itself is iterable.
 *
 * It is designed to be compatible with Java's `.properties` file format.
 *
 * @example
 * const properties = await PropertiesStore.load(fs.createReadStream("/path/to/my.properties"));
 *
 * properties.set("new-prop", "Hello, World!");
 * properties.get("new-prop");
 * //=> "Hello, World!"
 *
 * properties.get("missing-prop", "Some default value");
 * //=> "Some default value"
 *
 * await properties.store(fs.createWriteStream("/path/to/my.properties"));
 */
export class PropertiesStore extends EventEmitter {
  /**
   * Reads the property information from the `input` stream provided and loads it into a new {@link PropertiesStore}.
   *
   * If multiple lines are found for the same key in `input`, the value of the last line with that key will be used.
   *
   * Any Unicode escapes ("\uxxxx" notation) read from input will be converted to their corresponding Unicode
   * characters.
   *
   * @example
   * const properties = await PropertiesStore.load(fs.createReadStream("/path/to/my.properties"), { encoding: "utf8" });
   * properties.get("foo");
   * //=> "bar"
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * @param input The input stream from which the properties are to be read.
   * @param options The options to be used.
   * @return A {@link PropertiesStore} loaded with properties read from `input`.
   */
  static async load(
    input: NodeJS.ReadableStream,
    options?: PropertiesStoreLoadOptions,
  ) {
    const store = new PropertiesStore();
    await store.load(input, options);

    return store;
  }

  /**
   * Asserts that the specified `key` and `value` pair are both strings.
   *
   * @param key The key to be checked.
   * @param value The value to be checked.
   * @throws TypeError If either `key` or `value` are not strings.
   */
  static #assertKeyValue(key: unknown, value: unknown): void {
    if (typeof key !== "string") {
      throw new TypeError(`key must be a string: ${key}`);
    }
    if (typeof value !== "string") {
      throw new TypeError(`value must be a string: ${value}`);
    }
  }

  /**
   * A map containing the key/value pairs for the properties of this {@link PropertiesStore}.
   */
  #map = new Map<string, string>();

  /**
   * Creates an instance of {@link PropertiesStore}.
   *
   * Optionally, an `iterable` can be specified containing key/value pairs to be used as the initial properties for the
   * created {@link PropertiesStore} instance. This can be another instance of {@link PropertiesStore} or a simple 2D
   * string array, for example.
   *
   * @example
   * const original = new PropertiesStore([
   *   ["foo", "bar"],
   *   ["fu", "baz"],
   * ]);
   * const copy = new PropertiesStore(original);
   *
   * Array.from(copy);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * @param iterable An `Iterable` containing the initial properties to be used.
   * @throws TypeError If `iterable` contains an entry with either a key or value that are not strings.
   */
  constructor(iterable?: Iterable<[string, string]>) {
    super();

    if (iterable) {
      for (const [key, value] of iterable) {
        PropertiesStore.#assertKeyValue(key, value);

        this.#map.set(key, value);
      }
    }
  }

  /**
   * Removes all properties from this {@link PropertiesStore}.
   *
   * This method will trigger the following event(s):
   *
   * - `clear` after all properties have been removed
   * - `delete` for each property that has been removed
   *
   * @example
   * const properties = new PropertiesStore([
   *   ["foo", "bar"],
   *   ["fu", "baz"],
   * ]);
   *
   * properties.clear();
   * properties.size;
   * //=> 0
   * @fires PropertiesStore#event:clear
   * @fires PropertiesStore#event:delete
   */
  clear(): void {
    for (const [key, value] of this.#map.entries()) {
      this.#map.delete(key);

      this.emit("delete", {
        key,
        properties: this,
        value,
      });
    }

    this.emit("clear", { properties: this });
  }

  /**
   * Removes the property with the specified `key` from this {@link PropertiesStore}.
   *
   * `key` is case-sensitive. Alternatively, `key` can be a regular expression that can be used to delete any
   * properties with a matching key. It's important to note that using a regular expression is slower than using an
   * exact string as the former requires all properties to be iterated over and checked while the latter has the
   * performance of a hash lookup.
   *
   * This method will trigger the following event(s):
   *
   * - `delete` for each property that is removed
   *
   * @example
   * const properties = new PropertiesStore([
   *   ["foo", "bar"],
   *   ["fu", "baz"],
   *   ["fizz", "buzz"],
   * ]);
   *
   * properties.delete("FOO");
   * properties.has("foo");
   * //=> true
   *
   * properties.delete("foo");
   * properties.has("foo");
   * //=> false
   *
   * properties.delete(/^f(u|izz)$/);
   * properties.has("fu");
   * //=> false
   * properties.has("fizz");
   * //=> false
   * @param key The key of the property to be removed or a regular expression to delete any matching properties.
   * @return `true` if a property with `key` was successfully removed; otherwise `false`.
   * @fires PropertiesStore#event:delete
   */
  delete(key: string | RegExp): boolean {
    if (key instanceof RegExp) {
      let removedCount = 0;

      for (const existingKey of this.#map.keys()) {
        if (key.test(existingKey)) {
          this.#delete(existingKey);

          removedCount++;
        }
      }

      return removedCount > 0;
    }

    if (this.#map.has(key)) {
      this.#delete(key);

      return true;
    }

    return false;
  }

  /**
   * Returns an iterator containing the key/value pairs for each property in this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore([
   *   ["foo", "bar"],
   *   ["fu", "baz"],
   * ]);
   *
   * Array.from(properties.entries());
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * @return An `Iterator` for the key/value pairs for each property.
   */
  entries(): MapIterator<[string, string]> {
    return this.#map.entries();
  }

  /**
   * Invokes the specified `callback` function once per each property in this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore([
   *   ["foo", "bar"],
   *   ["fu", "baz"],
   * ]);
   *
   * properties.forEach((value, key) => console.log(`${key}=${value}`));
   * //=> "foo=bar"
   * //=> "fu=baz"
   * @param callback The function to execute for each property.
   * @param thisArg The value to use as `this` when invoking `callback`.
   */
  forEach(callback: PropertiesStoreForEachCallback, thisArg?: unknown): void {
    this.#map.forEach((value, key) => callback.call(thisArg, value, key, this));
  }

  /**
   * Returns the value of the property with the specified `key` in this {@link PropertiesStore}.
   *
   * `key` is case-sensitive.
   *
   * If no property is found matching `key`, `undefined` will be returned.
   *
   * @example
   * const properties = new PropertiesStore([["foo", "bar"]]);
   *
   * properties.get("foo");
   * //=> "bar"
   * properties.get("FOO");
   * //=> undefined
   * properties.get("fu");
   * //=> undefined
   * @param key The key of the property whose value is to be returned.
   * @return The value of the property with `key` or `undefined` if none exists.
   */
  get(key: string): string | undefined;

  /**
   * Returns the value of the property with the specified `key` in this {@link PropertiesStore}.
   *
   * `key` is case-sensitive.
   *
   * If no property is found matching `key`, `defaultValue` will be returned.
   *
   * @example
   * const properties = new PropertiesStore([["foo", "bar"]]);
   *
   * properties.get("foo", "baz");
   * //=> "bar"
   * properties.get("FOO", "baz");
   * //=> "baz"
   * properties.get("fu", "baz");
   * //=> "baz"
   * @param key The key of the property whose value is to be returned.
   * @param defaultValue The default value to be returned if no property with `key` exists.
   * @return The value of the property with `key` or `defaultValue` if none exists.
   */
  get(key: string, defaultValue: string): string;

  /**
   * Returns the value of the property with the specified `key` in this {@link PropertiesStore}.
   *
   * `key` is case-sensitive.
   *
   * If no property is found matching `key`, `defaultValue` will be returned.
   *
   * @example
   * const properties = new PropertiesStore([["foo", "bar"]]);
   *
   * properties.get("foo");
   * //=> "bar"
   * properties.get("FOO");
   * //=> undefined
   * properties.get("fu");
   * //=> undefined
   * properties.get("fu", undefined);
   * //=> undefined
   * properties.get("fu", "baz");
   * //=> "baz"
   * @param key The key of the property whose value is to be returned.
   * @param defaultValue The default value to be returned if no property with `key` exists.
   * @return The value of the property with `key` or `defaultValue` if none exists.
   */
  get(key: string, defaultValue?: string): string | undefined {
    const value = this.#map.get(key);
    if (value != null) {
      return value;
    }

    return defaultValue != null ? String(defaultValue) : defaultValue;
  }

  /**
   * Returns whether a property with the specified `key` exists within this {@link PropertiesStore}.
   *
   * `key` is case-sensitive. Alternatively, `key` can be a regular expression that can be used to check for the
   * existence of any property with a matching key. It's important to note that using a regular expression is slower
   * than using an exact string as the former requires all properties - up to and including the first matching
   * property - to be iterated over and checked while the latter has the performance of a hash lookup.
   *
   * @example
   * const properties = new PropertiesStore([["foo", "bar"]]);
   *
   * properties.has("foo");
   * //=> true
   * properties.has("FOO");
   * //=> false
   * properties.has("fu");
   * //=> false
   *
   * properties.has(/^f/);
   * //=> true
   * properties.has(/^ba/);
   * //=> false
   * @param key The key of the property to be checked or a regular expression to check for any matching properties.
   * @return `true` if a property with `key` exists; otherwise `false`.
   */
  has(key: string | RegExp): boolean {
    if (key instanceof RegExp) {
      for (const existingKey of this.#map.keys()) {
        if (key.test(existingKey)) {
          return true;
        }
      }

      return false;
    }

    return this.#map.has(key);
  }

  /**
   * Returns an iterator containing the keys for each property in this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore([
   *   ["foo", "bar"],
   *   ["fu", "baz"],
   * ]);
   *
   * Array.from(properties.keys());
   * //=> ["foo", "fu"]
   * @return An `Iterator` for the keys for each property.
   */
  keys(): MapIterator<string> {
    return this.#map.keys();
  }

  /**
   * Reads the property information from the `input` stream provided and loads it into this {@link PropertiesStore}.
   *
   * If multiple lines are found for the same key in `input`, the value of the last line with that key will be used.
   *
   * Any Unicode escapes ("\uxxxx" notation) read from input will be converted to their corresponding Unicode
   * characters.
   *
   * This method will trigger the following event(s):
   *
   * - `change` if a property is created/changed
   * - `error` if an error occurs while reading properties from `input`
   * - `load` once all properties have been read from `input`
   *
   * @example
   * const properties = new PropertiesStore()
   *
   * await properties.load(fs.createReadStream("/path/to/my.properties"), { encoding: "utf8" });
   * properties.get("foo");
   * //=> "bar"
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * @param input The input stream from which the properties are to be read.
   * @param options The options to be used.
   * @fires PropertiesStore#event:change
   * @fires PropertiesStore#event:error
   * @fires PropertiesStore#event:load
   */
  async load(
    input: NodeJS.ReadableStream,
    options: PropertiesStoreLoadOptions = {},
  ): Promise<void> {
    const { encoding = "latin1" } = options;

    const reader = new PropertiesReader({ encoding, stream: input });
    try {
      await reader.read(this);
    } catch (e) {
      this.emit("error", e);
      throw e;
    }

    this.emit("load", {
      input,
      options: { encoding },
      properties: this,
    });
  }

  /**
   * Replaces the value of each property whose key matches the specified regular expression in this
   * {@link PropertiesStore}, invoking the `callback` provided to determine the replacement value for each matching
   * property.
   *
   * This method will trigger the following event(s):
   *
   * - `change` if a property is changed
   *
   * @example
   * const properties = new PropertiesStore([
   *   ["foo", "bar"],
   *   ["fu", "baz"],
   *   ["fizz", "buzz"],
   * ]);
   *
   * properties.replace(/quux/, () => "foo");
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"], ["fizz", "buzz"]]
   *
   * properties.replace(/^f\S{2,3}$/, (value) => value.toUpperCase());
   * Array.from(properties);
   * //=> [["foo", "BAR"], ["fu", "baz"], ["fizz", "BUZZ"]]
   * @param regexp The regular expression to be used to search for matching properties whose value are to be set and/or
   * removed.
   * @param callback The function to provide the replacement value for each matching property.
   * @param thisArg The value to use as `this` when invoking `callback`.
   * @return A reference to this {@link PropertiesStore}.
   * @fires PropertiesStore#event:change
   */
  replace(
    regexp: RegExp,
    callback: PropertiesStoreReplaceCallback,
    thisArg?: unknown,
  ): this {
    for (const [key, value] of this.#map.entries()) {
      if (regexp.test(key)) {
        this.set(key, callback.call(thisArg, value, key, this));
      }
    }

    return this;
  }

  /**
   * Searches for matches between the specified regular expression and the keys within this {@link PropertiesStore},
   * returning a generator containing the key/value pairs for each matching property.
   *
   * @example
   * const properties = new PropertiesStore([
   *   ["foo", "bar"],
   *   ["fu", "baz"],
   * ]);
   *
   * Array.from(properties.search(/^ba/));
   * => []
   * Array.from(properties.search(/^f/));
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * @param regexp The regular expression to be used to search for matching properties.
   * @return A `Generator` for the key/value pairs for each property whose key matches `regexp`.
   */
  *search(regexp: RegExp): Generator<[string, string], void, unknown> {
    for (const [key, value] of this.#map.entries()) {
      if (regexp.test(key)) {
        yield [key, value];
      }
    }
  }

  /**
   * Sets the value of the property in this {@link PropertiesStore} with the specified `key` to `value`.
   *
   * `key` is case-sensitive.
   *
   * This method will trigger the following event(s):
   *
   * - `change` if a property is created/changed
   *
   * @example
   * const properties = new PropertiesStore();
   *
   * properties
   *   .set("foo", "bar")
   *   .set("fu", "baz");
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   *
   * properties.set("FOO", "BAR");
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"], ["FOO", "BAR"]]
   *
   * properties.set("foo", "BAR");
   * Array.from(properties);
   * //=> [["foo", "BAR"], ["fu", "baz"], ["FOO", "BAR"]]
   * @param key The key of the property whose value is to be set.
   * @param value The new value for the property.
   * @return {PropertiesStore} A reference to this {@link PropertiesStore}.
   * @throws TypeError If either `key` or `value` are not strings.
   * @fires PropertiesStore#event:change
   */
  set(key: string, value: string): this {
    PropertiesStore.#assertKeyValue(key, value);

    const oldValue = this.#map.get(key);

    if (value !== oldValue) {
      this.#map.set(key, value);

      this.emit("change", {
        key,
        newValue: value,
        oldValue,
        properties: this,
      });
    }

    return this;
  }

  /**
   * Writes the property information within this {@link PropertiesStore} to the `output` stream provided.
   *
   * By default, any characters that are not part of the ASCII character set will be converted to Unicode escapes
   * ("\uxxxx" notation) before being written to `output`. This behavior can be prevented by setting
   * {@link PropertiesStoreStoreOptions#disableUnicodeEscape} to `true`.
   *
   * This method will trigger the following event(s):
   *
   * - `error` if an error occurs while writing properties to `output`
   * - `store` once all properties have been written to `output`
   *
   * @example
   * const properties = new PropertiesStore([
   *   ["foo", "bàr"],
   *   ["fu", "bàz"],
   * ]);
   *
   * await properties.store(fs.createWriteStream("/path/to/my.properties"));
   * fs.readFileSync("/path/to/my.properties", "latin1");
   * //=> `# Mon Oct 31 21:05:00 GMT 2016
   * //=> foo=b\\u00e0r
   * //=> fu=b\\u00e0z
   * //=> `
   *
   * await properties.store(fs.createWriteStream("/path/to/my.properties"), {
   *   comments: "Some witty comment",
   *   disableUnicodeEscape: true,
   *   encoding: "utf8",
   * });
   * fs.readFileSync("/path/to/my.properties", "utf8");
   * //=> `# Some witty comment
   * //=> # Mon Oct 31 21:05:00 GMT 2016
   * //=> foo=bàr
   * //=> fu=bàz
   * //=> `
   * @param output The output stream to which the properties are to be written.
   * @param options The options to be used.
   * @fires PropertiesStore#event:error
   * @fires PropertiesStore#event:store
   */
  async store(
    output: NodeJS.WritableStream,
    options: PropertiesStoreStoreOptions = {},
  ): Promise<void> {
    const {
      comments,
      disableTimestamp = false,
      disableUnicodeEscape = false,
      encoding = "latin1",
    } = options;

    const writer = new PropertiesWriter({
      comments,
      enableTimestamp: !disableTimestamp,
      enableUnicodeEscape: !disableUnicodeEscape,
      encoding,
      stream: output,
    });
    try {
      await writer.write(this);
    } catch (e) {
      this.emit("error", e);
      throw e;
    }

    this.emit("store", {
      options: { comments, disableTimestamp, disableUnicodeEscape, encoding },
      output,
      properties: this,
    });
  }

  /**
   * Returns an iterator containing the values for each property in this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore([
   *   ["foo", "bar"],
   *   ["fu", "baz"],
   * ]);
   *
   * Array.from(properties.values());
   * //=> ["bar", "baz"]
   * @return An `Iterator` for the values for each property.
   */
  values(): MapIterator<string> {
    return this.#map.values();
  }

  /**
   * Returns an iterator containing the key/value pairs for each property in this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore([
   *   ["foo", "bar"],
   *   ["fu", "baz"],
   * ]);
   *
   * Array.from(properties.entries());
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * @return An `Iterator` for the key/value pairs for each property.
   */
  [Symbol.iterator](): MapIterator<[string, string]> {
    return this.#map.entries();
  }

  /**
   * Removes the property with the specified `key` from this {@link PropertiesStore}.
   *
   * The caller is responsible for ensuring a property exists for `key` before calling this method.
   *
   * This method will trigger the following event(s):
   *
   * - `delete` for each property that is removed
   *
   * @param key The key of the property to be removed.
   * @fires PropertiesStore#event:delete
   */
  #delete(key: string): void {
    const value = this.#map.get(key);

    this.#map.delete(key);

    this.emit("delete", {
      key,
      properties: this,
      value,
    });
  }

  /**
   * The number of properties in this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.size;
   * //=> 0
   *
   * properties.set("foo", "bar");
   * properties.set("fu", "baz");
   * properties.set("fu", "BAZ");
   *
   * properties.size;
   * //=> 2
   */
  get size(): number {
    return this.#map.size;
  }
}

/**
 * Emitted when the value of a property in a {@link PropertiesStore} has been set.
 *
 * @event PropertiesStore#event:change
 * @type {Object}
 * @property {string} key The key of the changed property.
 * @property {string} newValue The new value of the property.
 * @property {string|undefined} oldValue The old value of the property or `undefined` if there was none.
 * @property {PropertiesStore} properties The {@link PropertiesStore} on which the property was changed.
 */

/**
 * Emitted when a {@link PropertiesStore} is cleared.
 *
 * @event PropertiesStore#event:clear
 * @property {PropertiesStore} properties The {@link PropertiesStore} that was cleared.
 */

/**
 * Emitted when a property is removed from a {@link PropertiesStore}.
 *
 * @event PropertiesStore#event:delete
 * @type {Object}
 * @property {string} key The key of the removed property.
 * @property {PropertiesStore} properties The {@link PropertiesStore} from which the property was removed.
 * @property {string} value The value of the removed property.
 */

/**
 * Emitted when an error occurs while loading or storing properties from or to a {@link PropertiesStore}.
 *
 * @event PropertiesStore#event:error
 * @type {Error}
 */

/**
 * Emitted when properties are loaded into a {@link PropertiesStore}.
 *
 * @event PropertiesStore#event:load
 * @type {Object}
 * @property {NodeJS.ReadableStream} input The input stream from which the properties were read.
 * @property {PropertiesStoreLoadOptions} options The options that were used to load the properties.
 * @property {PropertiesStore} properties The {@link PropertiesStore} into which the properties were loaded.
 */

/**
 * Emitted when properties in a {@link PropertiesStore} are stored.
 *
 * @event PropertiesStore#event:store
 * @type {Object}
 * @property {PropertiesStoreStoreOptions} options The options that were used to store the properties.
 * @property {NodeJS.WritableStream} output The output stream to which the properties were written.
 * @property {PropertiesStore} properties The {@link PropertiesStore} from which the properties were written.
 */
