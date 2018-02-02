/*
 * Copyright (C) 2018 Alasdair Mercer, !ninja
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

'use strict';

const events = require('events');

const LineReader = require('./line-reader');
const LineWriter = require('./line-writer');

const _delete = Symbol('delete');
const _map = Symbol('map');

/**
 * A <code>PropertiesStore</code> represents a persistent set of properties which can be loaded from and/or saved to a
 * stream. Each property key and their corresponding value is a string which can be iterated over as
 * <code>PropertiesStore</code> itself is iterable.
 *
 * It is designed to be compatible with Java's <code>.properties</code> file format.
 *
 * Optionally, another <code>store</code> can be specified whose properties will be used as the base for the new
 * <code>PropertiesStore</code> instance.
 *
 * @example
 * const PropertiesStore = require('properties-store');
 *
 * const properties = new PropertiesStore();
 * properties.set('foo', 'bar');
 * properties.set('fu', 'baz');
 *
 * properties.get('foo');
 * //=> "bar"
 * properties.get('fu');
 * //=> "baz"
 *
 * const copy = new PropertiesStore(store);
 * Array.from(copy);
 * //=> [["foo", "bar"], ["fu", "baz"]]
 * @param {PropertiesStore} [store] - a {@link PropertiesStore} whose properties are to be used initially
 * @public
 */
class PropertiesStore extends events.EventEmitter {

  /**
   * Reads the property information from the <code>input</code> stream provided and loads it into a new
   * {@link PropertiesStore}.
   *
   * If multiple lines are found for the same key in <code>input</code>, the value of the last line with that key will
   * be used.
   *
   * Any Unicode escapes ("\uxxxx" notation) read from input will be converted to their corresponding Unicode
   * characters.
   *
   * @example
   * const properties = await PropertiesStore.load(fs.createReadStream('path/to/my.properties'), { encoding: 'utf8' });
   * properties.get('foo');
   * //=> "bar"
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * @param {stream.Readable} input - the input stream from which the properties are to be read
   * @param {Object} [options] - the options to be used
   * @param {string} [options.encoding="latin1"] - the character encoding to be used to read the input
   * @return {Promise.<PropertiesStore, Error>} A <code>Promise</code> that is resolved with the new
   * {@link PropertiesStore} once <code>input</code> has been read.
   * @public
   */
  static async load(input, options) {
    const store = new PropertiesStore();
    await store.load(input, options);

    return store;
  }

  constructor(store) {
    super();

    this[_map] = new Map();

    if (store != null) {
      for (const [ key, value ] of store) {
        this[_map].set(key, value);
      }
    }
  }

  /**
   * Removes all properties from this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.set('foo', 'bar');
   * properties.set('fu', 'baz');
   *
   * properties.clear();
   * properties.size;
   * //=> 0
   * @return {void}
   * @emits PropertiesStore#clear
   * @emits PropertiesStore#delete
   * @public
   */
  clear() {
    for (const [ key, value ] of this[_map].entries()) {
      this.emit('delete', {
        key,
        properties: this,
        value
      });
    }

    this[_map].clear();

    this.emit('clear', { properties: this });
  }

  /**
   * Removes the property with the specified <code>key</code> from this {@link PropertiesStore}.
   *
   * <code>key</code> is case sensitive. Alternatively, <code>key</code> can be a regular expression which can be used
   * to delete any properties with a matching key. It's important to note that using a regular expression is
   * considerably slower than using an exact string as the former requires all properties to be iterated over and
   * checked while the latter has the performance of a hash lookup.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.set('foo', 'bar');
   * properties.set('fu', 'baz');
   * properties.set('fizz', 'buzz');
   *
   * properties.delete('FOO');
   * properties.has('foo');
   * //=> true
   *
   * properties.delete('foo');
   * properties.has('foo');
   * //=> false
   *
   * properties.delete(/^f(u|izz)$/);
   * properties.has('fu');
   * //=> false
   * properties.has('fizz');
   * //=> false
   * @param {?string|RegExp} key - the key of the property to be removed or a regular expression to delete any matching
   * properties (may be <code>null</code>)
   * @return {boolean} <code>true</code> if a property with <code>key</code> was successfully removed; otherwise
   * <code>false</code>.
   * @emits PropertiesStore#delete
   * @public
   */
  delete(key) {
    if (key instanceof RegExp) {
      let removedCount = 0;

      for (const existingKey of this[_map].keys()) {
        if (key.test(existingKey)) {
          this[_delete](existingKey);

          removedCount++;
        }
      }

      return removedCount > 0;
    }

    if (this[_map].has(key)) {
      this[_delete](key);

      return true;
    }

    return false;
  }

  /**
   * Returns an iterator containing the key/value pairs for each property in this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.set('foo', 'bar');
   * properties.set('fu', 'baz');
   *
   * Array.from(properties.entries());
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * @return {Iterator.<string[]>} An <code>Iterator</code> for the key/value pairs for each property.
   * @public
   */
  entries() {
    return this[_map].entries();
  }

  /**
   * Executes the specified <code>callback</code> function once per each property in this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.set('foo', 'bar');
   * properties.set('fu', 'baz');
   *
   * properties.forEach((value, key) => console.log(`${key}=${value}`));
   * //=> "foo=bar"
   * //=> "fu=baz"
   * @param {PropertiesStore~ForEachCallback} callback - the function to execute for each property
   * @param {Object} [thisArg] - the value to use as <code>this</code> when executing <code>callback</code>
   * @return {void}
   * @public
   */
  forEach(callback, thisArg) {
    this[_map].forEach((value, key) => {
      callback.call(thisArg, value, key, this);
    });
  }

  /**
   * Returns the value of the property with the specified <code>key</code> in this {@link PropertiesStore}.
   *
   * <code>key</code> is case sensitive.
   *
   * If no property is found matching <code>key</code>, then this method will return <code>defaultValue</code>.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.set('foo', 'bar');
   *
   * properties.get('foo');
   * //=> "bar"
   * properties.get('FOO');
   * //=> undefined
   * properties.get('fu');
   * //=> undefined
   * properties.get('fu', 'baz');
   * //=> "baz"
   * properties.get('fu', 123);
   * //=> "123"
   * @param {?string} key - the key of the property whose value is to be returned (may be <code>null</code>)
   * @param {*} [defaultValue] - the default value to be returned if no property with <code>key</code> exists (will be
   * cast to a string - may be <code>null</code>)
   * @return {?string} The value of the property with <code>key</code> or <code>defaultValue</code> if none exists.
   * @public
   */
  get(key, defaultValue) {
    const value = this[_map].get(key);
    if (value != null) {
      return value;
    }

    return defaultValue != null ? String(defaultValue) : defaultValue;
  }

  /**
   * Returns whether a property with the specified <code>key</code> exists within this {@link PropertiesStore}.
   *
   * <code>key</code> is case sensitive. Alternatively, <code>key</code> can be a regular expression which can be used
   * to check for the existence of any property with a matching key. It's important to note that using a regular
   * expression is considerably slower than using an exact string as the former requires all properties - up to and
   * including the first matching property - to be iterated over and checked while the latter has the performance of a
   * hash lookup.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.set('foo', 'bar');
   *
   * properties.has('foo');
   * //=> true
   * properties.has('FOO');
   * //=> false
   * properties.has('fu');
   * //=> false
   *
   * properties.has(/^f/);
   * //=> true
   * properties.has(/^ba/);
   * //=> false
   * @param {?string|RegExp} key - the key of the property to be checked or a regular expression to check for any
   * matching properties (may be <code>null</code>)
   * @return {boolean} <code>true</code> if a property with <code>key</code> exists; otherwise <code>false</code>.
   * @public
   */
  has(key) {
    if (key instanceof RegExp) {
      for (const existingKey of this[_map].keys()) {
        if (key.test(existingKey)) {
          return true;
        }
      }

      return false;
    }

    return this[_map].has(key);
  }

  /**
   * Returns an iterator containing the keys for each property in this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.set('foo', 'bar');
   * properties.set('fu', 'baz');
   *
   * Array.from(properties.keys());
   * //=> ["foo", "fu"]
   * @return {Iterator.<string>} An <code>Iterator</code> for the keys for each property.
   * @public
   */
  keys() {
    return this[_map].keys();
  }

  /**
   * Reads the property information from the <code>input</code> stream provided and loads it into this
   * {@link PropertiesStore}.
   *
   * If multiple lines are found for the same key in <code>input</code>, the value of the last line with that key will
   * be used.
   *
   * Any Unicode escapes ("\uxxxx" notation) read from input will be converted to their corresponding Unicode
   * characters.
   *
   * @example
   * const properties = new PropertiesStore()
   *
   * await properties.load(fs.createReadStream('path/to/my.properties'), { encoding: 'utf8' });
   * properties.get('foo');
   * //=> "bar"
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * @param {stream.Readable} input - the input stream from which the properties are to be read
   * @param {Object} [options] - the options to be used
   * @param {string} [options.encoding="latin1"] - the character encoding to be used to read the input
   * @return {Promise.<void, Error>} A <code>Promise</code> that is resolved once <code>input</code> has been read into
   * this {@link PropertiesStore}.
   * @emits PropertiesStore#change
   * @emits PropertiesStore#load
   * @public
   */
  async load(input, options) {
    options = Object.assign({ encoding: 'latin1' }, options);

    const reader = new LineReader(input, options);
    await reader.read(this);

    this.emit('load', {
      input,
      options,
      properties: this
    });
  }

  /**
   * Replaces the value of each property whose key matches the specified regular expression in this
   * {@link PropertiesStore}, executing the <code>callback</code> provided to determine the replacement value for each
   * matching property.
   *
   * Nothing happens if <code>key</code> is <code>null</code>. If <code>callback</code> returns <code>null</code>,
   * {@link PropertiesStore#delete} will be called to removed the matching property.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.set('foo', 'bar');
   * properties.set('fu', 'baz');
   * properties.set('fizz', 'buzz');
   *
   * properties.replace(/quux/, () => 'foo');
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"], ["fizz", "buzz"]]
   *
   * properties.replace(/^f\S{2,3}$/, (value) => value.toUpperCase());
   * Array.from(properties);
   * //=> [["foo", "BAR"], ["fu", "baz"], ["fizz", "BUZZ"]]
   *
   * properties.replace(/FU/i, () => null);
   * Array.from(properties);
   * //=> [["foo", "BAR"], ["fizz", "BUZZ"]]
   * @param {?RegExp} regexp - the regular expression to be used to search for matching properties whose value are to be
   * set (may be <code>null</code>)
   * @param {PropertiesStore~ReplaceCallback} callback - the function to provide the replacement value for each matching
   * property
   * @param {Object} [thisArg] - the value to use as <code>this</code> when executing <code>callback</code>
   * @return {PropertiesStore} A reference to this {@link PropertiesStore}.
   * @emits PropertiesStore#change
   * @emits PropertiesStore#delete
   * @public
   */
  replace(regexp, callback, thisArg) {
    if (regexp == null) {
      return this;
    }

    for (const [ key, value ] of this[_map].entries()) {
      if (regexp.test(key)) {
        this.set(key, callback.call(thisArg, value, key, this));
      }
    }

    return this;
  }

  /**
   * Searches for matches between the specified regular expression and the keys within this {@link PropertiesStore},
   * returning an iterator containing the key/value pairs for each matching property.
   *
   * @example
   * const properties = new PropertiesStore()
   * properties.set('foo', 'bar');
   * properties.set('fu', 'baz');
   *
   * Array.from(properties.search(/^ba/));
   * => []
   * Array.from(properties.search(/^f/));
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * @param {?RegExp} regexp - the regular expression to be used to search for matching properties (may be
   * <code>null</code>)
   * @return {Iterator.<string[]>} An <code>Iterator</code> for the key/value pairs for each property whose key matches
   * <code>regexp</code>.
   * @public
   */
  *search(regexp) {
    if (regexp == null) {
      return;
    }

    for (const [ key, value ] of this[_map].entries()) {
      if (regexp.test(key)) {
        yield [ key, value ];
      }
    }
  }

  /**
   * Sets the value of the property in this {@link PropertiesStore} with the specified <code>key</code> to
   * <code>value</code>.
   *
   * <code>key</code> is case sensitive.
   *
   * Nothing happens if <code>key</code> is <code>null</code>. If <code>value</code> is <code>null</code>,
   * {@link PropertiesStore#delete} will be called to removed the property.
   *
   * @example
   * const properties = new PropertiesStore();
   *
   * properties
   *   .set('foo', 'bar')
   *   .set('fu', 'baz');
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   *
   * properties.set('FOO', 'BAR');
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"], ["FOO", "BAR"]]
   *
   * properties.set('FOO', null);
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   *
   * properties.set('foo', 'BAR');
   * Array.from(properties);
   * //=> [["foo", "BAR"], ["fu", "baz"]]
   * @param {?string} key - the key of the property whose value is to be set (may be <code>null</code>)
   * @param {*} value - the new value for the property (will be cast to a string - may be <code>null</code> to remove
   * the property instead)
   * @return {PropertiesStore} A reference to this {@link PropertiesStore}.
   * @emits PropertiesStore#change
   * @emits PropertiesStore#delete
   * @public
   */
  set(key, value) {
    if (key == null) {
      return this;
    }

    if (value == null) {
      if (this[_map].has(key)) {
        this[_delete](key);
      }
    } else {
      const newValue = String(value);
      const oldValue = this[_map].get(key);

      if (newValue !== oldValue) {
        this[_map].set(key, newValue);

        this.emit('change', {
          key,
          newValue,
          oldValue,
          properties: this
        });
      }
    }

    return this;
  }

  /**
   * Writes the property information within this {@link PropertiesStore} to the <code>output</code> stream provided.
   *
   * By default, any characters that are not part of the ASCII character set will be converted to Unicode escapes
   * ("\uxxxx" notation) before being written to <code>output</code>. This behaviour can be prevented by disabling the
   * <code>escapeUnicode</code> option.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.set('foo', 'bàr');
   * properties.set('fu', 'bàz');
   *
   * await properties.store(fs.createWriteStream('path/to/my.properties'));
   * fs.readFileSync('path/to/my.properties', 'latin1');
   * //=> "foo=b\\u00e0r
   * fu=b\\u00e0z
   * "
   *
   * await properties.store(fs.createWriteStream('path/to/my.properties'), { encoding: 'utf8', escapeUnicode: false});
   * fs.readFileSync('path/to/my.properties', 'utf8');
   * //=> "foo=bàr
   * fu=bàz
   * "
   * @param {stream.Writable} output - the output stream to which the properties are to be written
   * @param {Object} [options] - the options to be used
   * @param {string} [options.encoding="latin1"] - the character encoding to be used to write the output
   * @param {string} [options.escapeUnicode=true] - <code>true</code> to convert all non-ASCII characters to Unicode
   * escapes ("\uxxxx" notation); otherwise <code>false</code>
   * @return {Promise.<void, Error>} A <code>Promise</code> that is resolved once this {@link PropertiesStore} has been
   * written to <code>output</code>.
   * @emits PropertiesStore#store
   * @public
   */
  async store(output, options) {
    options = Object.assign({
      encoding: 'latin1',
      escapeUnicode: true
    }, options);

    const writer = new LineWriter(output, options);
    await writer.write(this);

    this.emit('store', {
      options,
      output,
      properties: this
    });
  }

  /**
   * Returns an iterator containing the values for each property in this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.set('foo', 'bar');
   * properties.set('fu', 'baz');
   *
   * Array.from(properties.values());
   * //=> ["bar", "baz"]
   * @return {Iterator.<string>} An <code>Iterator</code> for the values for each property.
   * @public
   */
  values() {
    return this[_map].values();
  }

  [Symbol.iterator]() {
    return this[_map].entries();
  }

  [_delete](key) {
    const value = this[_map].get(key);

    this[_map].delete(key);

    this.emit('delete', {
      key,
      properties: this,
      value
    });
  }

  /**
   * Returns the number of properties in this {@link PropertiesStore}.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.size;
   * //=> 0
   *
   * properties.set('foo', 'bar');
   * properties.set('fu', 'baz');
   *
   * properties.size;
   * //=> 2
   * @return {number} The number of properties.
   * @public
   */
  get size() {
    return this[_map].size;
  }

}

module.exports = PropertiesStore;

/**
 * The callback function that is passed to {@link PropertiesStore#forEach}.
 *
 * @public
 * @callback PropertiesStore~ForEachCallback
 * @param {string} value - the property value
 * @param {string} key - the property key
 * @param {PropertiesStore} properties - the {@link PropertiesStore}
 * @return {void}
 */

/**
 * The callback function that is passed to {@link PropertiesStore#replace}.
 *
 * @public
 * @callback PropertiesStore~ReplaceCallback
 * @param {string} value - the property value
 * @param {string} key - the property key
 * @param {PropertiesStore} properties - the {@link PropertiesStore}
 * @return {*} The replacement value for the property or <code>null</code> to remove the property instead.
 */

/**
 * Emitted when the value of a property in a {@link PropertiesStore} has been set.
 *
 * @public
 * @event PropertiesStore#change
 * @kind event
 * @memberof PropertiesStore
 * @name change
 * @type {Object}
 * @property {string} key - The key of the changed property.
 * @property {string} newValue - The new value of the property.
 * @property {?string} oldValue - The old value of the property or <code>undefined</code> if there was none.
 * @property {PropertiesStore} properties - The {@link PropertiesStore} on which the property was changed.
 */

/**
 * Emitted when a {@link PropertiesStore} is cleared.
 *
 * @public
 * @event PropertiesStore#clear
 * @kind event
 * @memberof PropertiesStore
 * @name clear
 * @property {PropertiesStore} properties - The {@link PropertiesStore} that was cleared.
 */

/**
 * Emitted when a property is removed from a {@link PropertiesStore}.
 *
 * @public
 * @event PropertiesStore#delete
 * @kind event
 * @memberof PropertiesStore
 * @name delete
 * @type {Object}
 * @property {string} key - The key of the removed property.
 * @property {PropertiesStore} properties - The {@link PropertiesStore} from which the property was removed.
 * @property {string} value - The value of the removed property.
 */

/**
 * Emitted when properties are loaded into a {@link PropertiesStore}.
 *
 * @public
 * @event PropertiesStore#load
 * @kind event
 * @memberof PropertiesStore
 * @name load
 * @type {Object}
 * @property {stream.Readable} input - The input stream from which the properties were read.
 * @property {Object} options - The options that were used to load the properties.
 * @property {PropertiesStore} properties - The {@link PropertiesStore} into which the properties were loaded.
 */

/**
 * Emitted when properties in a {@link PropertiesStore} are stored.
 *
 * @public
 * @event PropertiesStore#store
 * @kind event
 * @memberof PropertiesStore
 * @name store
 * @type {Object}
 * @property {Object} options - The options that were used to store the properties.
 * @property {stream.Writable} output - The output stream to which the properties were written.
 * @property {PropertiesStore} properties - The {@link PropertiesStore} from which the properties were written.
 */
