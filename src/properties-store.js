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
const native2ascii = require('node-native2ascii');
const os = require('os');

const Doc = require('./doc');
const Line = require('./line');

const _doc = Symbol('doc');
const _properties = Symbol('properties');
const _readStream = Symbol('readStream');
const _set = Symbol('set');
const _writeStream = Symbol('writeStream');

// TODO: Support XML persistence (restrict crossing source doc types)

/**
 * A <code>PropertiesStore</code> represents a persistent set of properties which can be loaded from and/or saved to a
 * stream. Each property key and their corresponding value is a string which can be iterated over as
 * <code>PropertiesStore</code> itself is iterable.
 *
 * It is designed to be compatible with Java's <code>.properties</code> file format, however, it also has the ability to
 * maintain non-properties lines that are loaded from an input stream, which can be useful when wanting to make
 * non-intrusive changes to the original source.
 *
 * The <code>preserve</code> option can be enabled so that all lines read by {@link PropertiesStore#load} are maintained
 * and also written by {@link PropertiesStore#store}, but it's worth noting that doing so can slow certain operations
 * while {@link PropertiesStore} maintains synchronization with the property lines amongst the other preserved lines.
 *
 * Optionally, another <code>store</code> can be specified whose properties (and lines, if preserved) will be used as
 * the base for the new <code>PropertiesStore</code> instance.
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
 * @param {PropertiesStore} [store] - a {@link PropertiesStore} whose properties and lines, where applicable, are to
 * be used initially
 * @param {Object} [options] - the options to be used
 * @param {boolean} [options.preserve=false] - <code>true</code> to preserve all lines read by
 * {@link PropertiesStore#load}, even those that do not represent properties; otherwise <code>false</code>
 * @public
 */
class PropertiesStore extends events.EventEmitter {

  /**
   * Reads the property information from the <code>input</code> stream provided and loads it into a new
   * {@link PropertiesStore}.
   *
   * If property lines are found with the same key in <code>input</code>, the value of the latest property line with
   * that key will be set as the value.
   *
   * The <code>preserve</code> option can be enabled so that all lines read by this method are maintained and also
   * written by {@link PropertiesStore#store}, but it's worth noting that doing so can slow certain operations while
   * {@link PropertiesStore} maintains synchronization with the property lines amongst the other preserved lines.
   *
   * By default, any Unicode escapes ("\uxxxx" notation) read from <code>input</code> will be converted to their
   * corresponding Unicode characters. This behaviour can be prevented by disabling the <code>unescape</code> option.
   *
   * @example
   * const properties = await PropertiesStore.load(fs.createReadStream('path/to/my.properties'), {
   *   encoding: 'utf8',
   *   unescape: false
   * });
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * Array.from(properties.lines());
   * //> ["foo = bar", "fu = baz"]
   *
   * const completeProperties = await PropertiesStore.load(fs.createReadStream('path/to/my.properties'), {
   *   encoding: 'utf8',
   *   preserve: true,
   *   unescape: false
   * });
   * Array.from(completeProperties);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * Array.from(completeProperties.lines());
   * //> ["# My Properties", "", "foo = bar", "fu = baz"]
   * @param {stream.Readable} input - the input stream from which the properties are to be read
   * @param {Object} [options] - the options to be used
   * @param {string} [options.encoding="latin1"] - the character encoding to be used to read the input
   * @param {boolean} [options.preserve=false] - <code>true</code> to preserve all lines read, even those that do not
   * represent properties; otherwise <code>false</code>
   * @param {boolean} [options.unescape=true] - <code>true</code> to convert all Unicode escapes ("\uxxxx" notation) to
   * their corresponding Unicode characters; otherwise <code>false</code>
   * @return {Promise.<PropertiesStore, Error>} A <code>Promise</code> that is resolved with the new
   * {@link PropertiesStore} once <code>input</code> has be read.
   * @public
   */
  static async load(input, options) {
    const store = new PropertiesStore(options);
    await store.load(input, options);

    return store;
  }

  static [_readStream](stream, encoding) {
    return new Promise((resolve, reject) => {
      // Just in case stream is STDIN when run in TTY context
      if (stream.isTTY) {
        resolve(Buffer.alloc(0));
      } else {
        const data = [];
        let length = 0;

        stream.on('error', (error) => {
          reject(error);
        });

        stream.on('readable', () => {
          let chunk;

          while ((chunk = stream.read()) != null) {
            data.push(chunk);
            length += chunk.length;
          }
        });

        stream.on('end', () => {
          resolve(Buffer.concat(data, length).toString(encoding));
        });
      }
    });
  }

  static [_writeStream](stream, output, encoding) {
    return new Promise((resolve, reject) => {
      stream.on('error', (error) => {
        reject(error);
      });

      stream.on('finish', () => {
        resolve();
      });

      stream.end(output, encoding);
    });
  }

  constructor(store, options) {
    super();

    if (store != null && !(store instanceof PropertiesStore)) {
      options = store;
      store = null;
    }

    options = Object.assign({ preserve: false }, options);

    this[_properties] = new Map();

    if (options.preserve) {
      this[_doc] = new Doc();
    }

    if (store != null) {
      for (const [ key, value ] of store) {
        this[_properties].set(key, value);
      }

      if (this[_doc]) {
        if (store[_doc]) {
          for (const line of store[_doc]) {
            // Lines are mutable so recreate from source to avoid unexpected synchronization issues
            this[_doc].add(new Line(line.source));
          }
        } else {
          for (const [ key, value ] of store) {
            this[_doc].add(Line.createProperty(key, value));
          }
        }
      }
    }
  }

  /**
   * Removes all properties from this {@link PropertiesStore}.
   *
   * If this {@link PropertiesStore} is preserving all lines, they will all be removed.
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
    for (const [ key, value ] of this[_properties].entries()) {
      this.emit('delete', {
        key,
        properties: this,
        value
      });
    }

    this[_properties].clear();

    if (this[_doc]) {
      this[_doc].clear();
    }

    this.emit('clear', { properties: this });
  }

  /**
   * Removes the property with the specified <code>key</code> from this {@link PropertiesStore}.
   *
   * <code>key</code> is case sensitive.
   *
   * If this {@link PropertiesStore} is preserving all lines, each line representing the property with <code>key</code>
   * will be removed.
   *
   * @example
   * const properties = new PropertiesStore();
   * properties.set('foo', 'bar');
   *
   * properties.delete('FOO');
   * properties.has('foo');
   * //=> true
   *
   * properties.delete('foo');
   * properties.has('foo');
   * //=> false
   * @param {?string} key - the key of the property to be removed (may be <code>null</code>)
   * @return {boolean} <code>true</code> if a property with <code>key</code> was successfully removed; otherwise
   * <code>false</code>.
   * @emits PropertiesStore#delete
   * @public
   */
  delete(key) {
    if (this[_properties].has(key)) {
      const value = this[_properties].get(key);

      this[_properties].delete(key);

      if (this[_doc]) {
        this[_doc].delete(key);
      }

      this.emit('delete', {
        key,
        properties: this,
        value
      });

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
    return this[_properties].entries();
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
    this[_properties].forEach((value, key) => {
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
    const value = this[_properties].get(key);
    if (value != null) {
      return value;
    }

    return defaultValue != null ? String(defaultValue) : defaultValue;
  }

  /**
   * Returns whether a property with the specified <code>key</code> exists within this {@link PropertiesStore}.
   *
   * <code>key</code> is case sensitive.
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
   * @param {?string} key - the key of the property to be checked (may be <code>null</code>)
   * @return {boolean} <code>true</code> if a property with <code>key</code> exists; otherwise <code>false</code>.
   * @public
   */
  has(key) {
    return this[_properties].has(key);
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
    return this[_properties].keys();
  }

  /**
   * Returns an iterator containing the source lines in this {@link PropertiesStore}.
   *
   * If this {@link PropertiesStore} is preserving all lines, they will all be included, regardless of whether or not
   * they represent a property.
   *
   * @example
   * const properties = new PropertiesStore();
   * await properties.load(fs.createReadStream('path/to/my.properties'));
   *
   * Array.from(properties.lines());
   * //=> ["foo = bar", "fu = baz"]
   *
   * const completeProperties = new PropertiesStore({ preserve: true });
   * await completeProperties.load(fs.createReadStream('path/to/my.properties'));
   *
   * Array.from(completeProperties.lines());
   * //=> ["# My Properties", "", "foo = bar", "fu = baz"]
   * @return {Iterator.<string>} An <code>Iterator</code> for each line.
   * @public
   */
  *lines() {
    let doc = this[_doc];
    if (!doc) {
      doc = new Doc();

      for (const [ key, value ] of this[_properties]) {
        doc.add(Line.createProperty(key, value));
      }
    }

    for (const line of doc) {
      yield line.source;
    }
  }

  /**
   * Reads the property information from the <code>input</code> stream provided and loads it into this
   * {@link PropertiesStore}.
   *
   * If property lines are found with the same key in either this {@link PropertiesStore} or <code>input</code>, the
   * value of the latest property line with that key will be set as the value.
   *
   * If this {@link PropertiesStore} is preserving all lines, they will all be loaded from <code>input</code> and
   * maintained within this {@link PropertiesStore}, regardless of whether or not they represent a property. Each line
   * loaded will be added after any previously loaded lines, where applicable.
   *
   * By default, any Unicode escapes ("\uxxxx" notation) read from <code>input</code> will be converted to their
   * corresponding Unicode characters. This behaviour can be prevented by disabling the <code>unescape</code> option.
   *
   * @example
   * const properties = new PropertiesStore()
   *
   * await properties.load(fs.createReadStream('path/to/my.properties'), {
   *   encoding: 'utf8',
   *   unescape: false
   * });
   * Array.from(properties);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * Array.from(properties.lines());
   * //> ["foo = bar", "fu = baz"]
   *
   * const completeProperties = new PropertiesStore({ preserve: true });
   *
   * await completeProperties.load(fs.createReadStream('path/to/my.properties'), {
   *   encoding: 'utf8',
   *   unescape: false
   * });
   * Array.from(completeProperties);
   * //=> [["foo", "bar"], ["fu", "baz"]]
   * Array.from(completeProperties.lines());
   * //> ["# My Properties", "", "foo = bar", "fu = baz"]
   * @param {stream.Readable} input - the input stream from which the properties are to be read
   * @param {Object} [options] - the options to be used
   * @param {string} [options.encoding="latin1"] - the character encoding to be used to read the input
   * @param {boolean} [options.unescape=true] - <code>true</code> to convert all Unicode escapes ("\uxxxx" notation) to
   * their corresponding Unicode characters; otherwise <code>false</code>
   * @return {Promise.<void, Error>} A <code>Promise</code> that is resolved once <code>input</code> has be read into
   * this {@link PropertiesStore}.
   * @emits PropertiesStore#change
   * @emits PropertiesStore#load
   * @public
   */
  async load(input, options) {
    options = Object.assign({
      encoding: 'latin1',
      unescape: true
    }, options);

    let str = await PropertiesStore[_readStream](input, options.encoding);
    if (options.unescape) {
      str = native2ascii(str, { reverse: true });
    }

    Doc.parse(str, (line) => {
      if (this[_doc]) {
        this[_doc].add(line);
      }

      if (line.property) {
        this[_set](line.key, line.value);
      }
    });

    this.emit('load', {
      input,
      options,
      properties: this
    });
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
   * If this {@link PropertiesStore} is preserving all lines, the last line representing the property with
   * <code>key</code> will be updated with <code>value</code>, if one exists, otherwise a new line will be added for the
   * property. If <code>value</code> is <code>null</code>, each line representing the property with <code>key</code>
   * will be removed.
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
   * @param {*} value - the new value for the property (will be cast to a string without leading whitespace - may be
   * <code>null</code> to remove property instead)
   * @return {PropertiesStore} A reference to this {@link PropertiesStore}.
   * @emits PropertiesStore#change
   * @emits PropertiesStore#delete
   * @public
   */
  set(key, value) {
    if (value == null) {
      this.delete(key);
    } else {
      this[_set](key, value, true);
    }

    return this;
  }

  /**
   * Writes the property information within this {@link PropertiesStore} to the <code>output</code> stream provided.
   *
   * If this {@link PropertiesStore} is preserving all lines, they will all be written directly to <code>output</code>.
   * Otherwise, only lines for properties within this {@link PropertiesStore} will be written to <code>output</code>.
   *
   * By default, any characters that are not part of the ASCII character set will be converted to Unicode escapes
   * ("\uxxxx" notation) before being written to <code>output</code>. This behaviour can be prevented by disabling the
   * <code>escape</code> option.
   *
   * @example
   * const properties = new PropertiesStore();
   * await properties.load(fs.createReadStream('path/to/my.properties'));
   * properties.set('foo', 'BAR');
   * properties.set('fu', null);
   *
   * await properties.store(fs.createWriteStream('path/to/my.properties'));
   * fs.readFileSync('path/to/my.properties', 'latin1');
   * //=> "foo = BAR"
   *
   * const completeProperties = new PropertiesStore({ preserve: true });
   * await completeProperties.load(fs.createReadStream('path/to/my.properties'));
   * completeProperties.set('foo', 'BAR');
   * completeProperties.set('fu', null);
   *
   * await completeProperties.store(fs.createWriteStream('path/to/my.properties'));
   * fs.readFileSync('path/to/my.properties', 'latin1');
   * //=> "# My Properties
   *
   * foo = BAR"
   * @param {stream.Writable} output - the output stream to which the properties are to be written
   * @param {Object} [options] - the options to be used
   * @param {string} [options.encoding="latin1"] - the character encoding to be used to write the output
   * @param {boolean} [options.escape=true] - <code>true</code> to convert all non-ASCII characters to Unicode escapes
   * ("\uxxxx" notation); otherwise <code>false</code>
   * @return {Promise.<void, Error>} A <code>Promise</code> that is resolved once this {@link PropertiesStore} has been
   * written to <code>output</code>.
   * @emits PropertiesStore#store
   * @public
   */
  async store(output, options) {
    options = Object.assign({
      encoding: 'latin1',
      escape: true
    }, options);

    let firstLine = true;
    let str = '';
    for (const line of this.lines()) {
      if (firstLine) {
        firstLine = false;
        str = line;
      } else {
        str += `${os.EOL}${line}`;
      }
    }

    if (options.escape) {
      str = native2ascii(str);
    }

    await PropertiesStore[_writeStream](output, str, options.encoding);

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
    return this[_properties].values();
  }

  [Symbol.iterator]() {
    return this[_properties].entries();
  }

  [_set](key, value, updateDoc) {
    if (key == null) {
      return;
    }

    const newValue = String(value);
    const oldValue = this[_properties].get(key);

    if (updateDoc && this[_doc]) {
      const line = this[_doc].get(key);

      if (line) {
        line.value = newValue;
      } else {
        this[_doc].add(Line.createProperty(key, newValue));
      }
    }

    if (newValue !== oldValue) {
      this[_properties].set(key, newValue);

      this.emit('change', {
        key,
        newValue,
        oldValue,
        properties: this
      });
    }
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
    return this[_properties].size;
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
