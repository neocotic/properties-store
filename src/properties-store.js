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

const { EOL } = require('os');
const { EventEmitter } = require('events');
const native2ascii = require('node-native2ascii');

const Doc = require('./doc');
const Line = require('./line');

const _doc = Symbol('doc');
const _properties = Symbol('properties');
const _readStream = Symbol('readStream');
const _set = Symbol('set');
const _writeStream = Symbol('writeStream');

// TODO: Support XML persistence (restrict crossing source doc types)

/**
 * A <code>PropertiesStore</code> representing a persistent set of properties which can be loaded from and/or saved to a
 * stream. Each property key and their corresponding value is a string.
 *
 * It is designed to be compatible with Java's <code>.properties</code> file format, however, it also has the ability to
 * maintain non-properties lines that are loaded from an input stream, which can be useful when wanting to make
 * non-intrusive changes to the original source.
 *
 * @public
 */
class PropertiesStore extends EventEmitter {

  /**
   * Reads the property information from the <code>input</code> stream provided and loads it into a new
   * {@link PropertiesStore}.
   *
   * If property lines are found with the same key in <code>input</code>, the value of the latest property line with
   * that key will be set as the value.
   *
   * If the <code>preserveLines</code> option is enabled, all lines will all be loaded from <code>input</code> and
   * maintained by the {@link PropertiesStore}, regardless of whether or not they represent a property.
   *
   * @param {Readable} input - the input stream from which the properties are to be read
   * @param {?PropertiesStore~StaticLoadOptions} [options] - the options to be used
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

  /**
   * Creates an instance of {@link PropertiesStore} using the <code>options</code> provided.
   *
   * @param {?PropertiesStore~Options} [options] - the options to be used
   * @public
   */
  constructor(options) {
    // TODO: Allow another store to be passed whose properties (and lines?) should be used as a based (options should be honored)
    super();

    options = Object.assign({ preserveLines: false }, options);

    this[_properties] = new Map();

    if (options.preserveLines) {
      this[_doc] = new Doc();
    }
  }

  /**
   * Removes all properties from this {@link PropertiesStore}.
   *
   * If this {@link PropertiesStore} is preserving all lines, they will all be removed.
   *
   * @return {void}
   * @emits PropertiesStore#clear
   * @emits PropertiesStore#delete
   * @public
   */
  clear() {
    for (const [ key, value ] of this[_properties].entries()) {
      this.emit('delete', {
        key,
        store: this,
        value
      });
    }

    this[_properties].clear();

    if (this[_doc]) {
      this[_doc].clear();
    }

    this.emit('clear', { store: this });
  }

  /**
   * Removes the property with the specified <code>key</code> from this {@link PropertiesStore}.
   *
   * <code>key</code> is case sensitive.
   *
   * If this {@link PropertiesStore} is preserving all lines, each line representing the property with <code>key</code>
   * will be removed.
   *
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
        store: this,
        value
      });

      return true;
    }

    return false;
  }

  /**
   * Returns an iterator containing the key/value pairs for each property in this {@link PropertiesStore}.
   *
   * @return {Iterator.<string[]>} An <code>Iterator</code> for the key/value pairs for each property.
   * @public
   */
  entries() {
    return this[_properties].entries();
  }

  /**
   * Executes the specified <code>callback</code> function once per each property in this {@link PropertiesStore}.
   *
   * @param {PropertiesStore~ForEachCallback} callback - the function to execute for each property
   * @param {?Object} [thisArg] - the value to use as <code>this</code> when executing <code>callback</code>
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
   * @return {Iterator.<string>} An <code>Iterator</code> for the keys for each property.
   * @public
   */
  keys() {
    return this[_properties].keys();
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
   * @param {Readable} input - the input stream from which the properties are to be read
   * @param {?PropertiesStore~LoadOptions} [options] - the options to be used
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
      store: this
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
   * @param {Writable} output - the output stream to which the properties are to be written
   * @param {?PropertiesStore~StoreOptions} [options] - the options to be used
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

    let doc = this[_doc];
    if (!doc) {
      doc = new Doc();

      for (const [ key, value ] of this[_properties]) {
        doc.add(Line.createProperty(key, value));
      }
    }

    let str = doc.join(EOL);
    if (options.escape) {
      str = native2ascii(str);
    }

    await PropertiesStore[_writeStream](output, str, options.encoding);

    this.emit('store', {
      options,
      output,
      store: this
    });
  }

  /**
   * Returns an iterator containing the values for each property in this {@link PropertiesStore}.
   *
   * @return {Iterator.<string>} An <code>Iterator</code> for the values for each property.
   * @public
   */
  values() {
    return this[_properties].values();
  }

  /**
   * @override
   */
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
        store: this
      });
    }
  }

  /**
   * Returns the number of properties in this {@link PropertiesStore}.
   *
   * @return {number} The number of properties.
   * @public
   */
  get size() {
    return this[_properties].size;
  }

}

module.exports = PropertiesStore;

/**
 * The options passed to the {@link PropertiesStore#load} instance method.
 *
 * @typedef {Object} PropertiesStore~LoadOptions
 * @property {string} [encoding="latin1"] - The character encoding to be used to read the input.
 * @property {boolean} [unescape=true] - <code>true</code> to convert all Unicode escapes ("\uxxxx" notation) to their
 * corresponding Unicode characters; otherwise <code>false</code>.
 */

/**
 * The options passed to the {@link PropertiesStore} constructor.
 *
 * @typedef {Object} PropertiesStore~Options
 * @property {boolean} [preserveLines] - <code>true</code> to preserve all lines read by {@link PropertiesStore#load},
 * even those that do not represent properties; otherwise <code>false</code>. All preserved lines will also be written
 * by {@link PropertiesStore#store}, but it's worth noting that doing so can slow certain operations while
 * {@link PropertiesStore} maintains synchronization with the property lines amongst the other preserved lines.
 */

/**
 * The options passed to the {@link PropertiesStore.load} static method.
 *
 * @typedef {PropertiesStore~LoadOptions} PropertiesStore~StaticLoadOptions
 * @property {boolean} [preserveLines] - <code>true</code> to preserve all lines read, even those that do not represent
 * properties; otherwise <code>false</code>. All preserved lines will also be written by {@link PropertiesStore#store},
 * but it's worth noting that doing so can slow certain operations while {@link PropertiesStore} maintains
 * synchronization with the property lines amongst the other preserved lines.
 */

/**
 * The options passed to the {@link PropertiesStore#store} method.
 *
 * @typedef {Object} PropertiesStore~StoreOptions
 * @property {string} [encoding="latin1"] - The character encoding to be used to write the output.
 * @property {boolean} [escape=true] - <code>true</code> to convert all non-ASCII characters to Unicode escapes
 * ("\uxxxx" notation); otherwise <code>false</code>.
 */

/**
 * The callback function that is passed to {@link PropertiesStore#forEach}.
 *
 * @callback PropertiesStore~ForEachCallback
 * @param {string} value - the property value
 * @param {string} key - the property key
 * @param {PropertiesStore} store - the {@link PropertiesStore}
 */

/**
 * Emitted when the value of a property in a {@link PropertiesStore} has been set.
 *
 * @event PropertiesStore#change
 * @type {Object}
 * @property {string} key - The key of the changed property.
 * @property {string} newValue - The new value of the property.
 * @property {?string} oldValue - The old value of the property or <code>undefined</code> if there was none.
 * @property {PropertiesStore} store - The {@link PropertiesStore} on which the property was changed.
 */

/**
 * Emitted when a {@link PropertiesStore} is cleared.
 *
 * @event PropertiesStore#clear
 * @property {PropertiesStore} store - The {@link PropertiesStore} that was cleared.
 */

/**
 * Emitted when a property is removed from a {@link PropertiesStore}.
 *
 * @event PropertiesStore#delete
 * @type {Object}
 * @property {string} key - The key of the removed property.
 * @property {PropertiesStore} store - The {@link PropertiesStore} from which the property was removed.
 * @property {string} value - The value of the removed property.
 */

/**
 * Emitted when properties are loaded into a {@link PropertiesStore}.
 *
 * @event PropertiesStore#load
 * @type {Object}
 * @property {stream.Readable} input - The input stream from which the properties were read.
 * @property {PropertiesStore~LoadOptions} options - The options that were used to load the properties.
 * @property {PropertiesStore} store - The {@link PropertiesStore} into which the properties were loaded.
 */

/**
 * Emitted when properties in a {@link PropertiesStore} are stored.
 *
 * @event PropertiesStore#store
 * @type {Object}
 * @property {PropertiesStore~StoreOptions} options - The output stream to which the properties were written.
 * @property {stream.Writable} output - The options that were used to store the properties.
 * @property {PropertiesStore} store - The {@link PropertiesStore} from which the properties were written.
 */
