/*
 * Copyright (C) 2017 Alasdair Mercer, !ninja
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

const _ = require('underscore');
const ascii2native = require('native2ascii').ascii2native;
const EventEmitter = require('events').EventEmitter;
const iconv = require('iconv-lite');
const native2ascii = require('native2ascii').native2ascii;
const os = require('os');

const Line = require('./line');

const _findLineIndex = Symbol('findLineIndex');
const _findLines = Symbol('findLines');
const _lines = Symbol('lines');
const _properties = Symbol('properties');
const _removeLines = Symbol('removeLines');

/**
 * The default options to be used by {@link Store#load} and {@link Store#store}.
 *
 * @private
 * @type {Store~options}
 */
const defaultOptions = {
  convert: true,
  encoding: 'iso-8859-1'
};

/**
 * TODO: Document
 *
 * @public
 * @extends events.EventEmitter
 */
class Store extends EventEmitter {

  /**
   * Creates an instance of {@link Store}.
   *
   * Optionally, the new {@link Store} can be based on a given <code>store</code>.
   *
   * @param {Store} [store] - the {@link Store} on which the one will be based
   * @public
   */
  constructor(store) {
    super();

    /**
     * The lines for this {@link Store}.
     *
     * @private
     * @type {Line[]}
     */
    this[_lines] = store ? _.clone(store[_lines]) : [];

    /**
     * A map of properties within this {@link Store}.
     *
     * @private
     * @type {Object.<string, string>}
     */
    this[_properties] = store ? _.clone(store[_properties]) : {};
  }

  /**
   * Removes all properties from this {@link Store}.
   *
   * As a result, all lines will also be cleared from the source should this {@link Store} be stored.
   *
   * @return {void}
   * @emits Store#clear
   * @public
   */
  clear() {
    this[_lines] = [];
    this[_properties] = {};

    this.emit('clear');
  }

  /**
   * Returns whether this {@link Store} contains a property with the specified <code>key</code>.
   *
   * @param {string} key - the key of the property to be checked
   * @return {boolean} <code>true</code> if a property with <code>key</code> exists; otherwise <code>false</code>.
   * @public
   */
  contains(key) {
    return this[_properties][key] != null;
  }

  /**
   * Returns the key/value pairs for each property in this {@link Store}.
   *
   * @return {Array.<string[]>} The key/value pairs for each property.
   * @public
   */
  entries() {
    return _.mapObject(this[_properties], (value, key) => {
      return [ key, value ];
    });
  }

  /**
   * Returns the value of the property in this {@link Store} with the specified <code>key</code>.
   *
   * If no property is found matching <code>key</code>, then this method will return <code>defaultValue</code>.
   *
   * If multiple lines exist within the source with the same <code>key</code>, this method will returned the value of
   * the last line with the <code>key</code> will be returned.
   *
   * @param {string} key - the key of the property whose value is to be returned
   * @param {*} [defaultValue] - the default value to be returned if no property with <code>key</code> exists (will be
   * cast to a string)
   * @return {string} The value of the property with <code>key</code> or <code>defaultValue</code> if none exists.
   * <code>null</code> will be returned if <code>defaultValue</code> is <code>null</code> or was not specified.
   * @public
   */
  get(key, defaultValue) {
    const value = this[_properties][key];
    if (value != null) {
      return value;
    }

    return defaultValue != null ? String(defaultValue) : null;
  }

  /**
   * Returns whether this {@link Store} contains no properties.
   *
   * Even if no properties exist within this {@link Store}, that does not mean that the source is empty. If a source
   * contained non-property lines (e.g. comments, blank lines), they could still be stored even if this {@link Store}
   * contains no properties.
   *
   * @return {boolean} <code>true</code> if no properties exist; otherwise <code>false</code>.
   * @public
   */
  isEmpty() {
    return _.isEmpty(this[_properties]);
  }

  /**
   * Returns the keys for each property in this {@link Store}.
   *
   * The returned array will contain only unique property keys and will not contain any duplications that may exist
   * within the source.
   *
   * @return {string[]} The keys for each property.
   * @public
   */
  keys() {
    return _.keys(this[_properties]);
  }

  /**
   * Loads property information from the <code>input</code> stream provided.
   *
   * @param {stream.Readable} input - the input stream from which the properties are to be read
   * @param {Store~options} [options] - the options to be used
   * @param {Function} callback - the function to be called once the properties have been loaded or an error occurs
   * @return {void}
   * @emits Store#load
   * @public
   */
  load(input, options, callback) {
    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }

    options = _.defaults({}, options, defaultOptions);

    input.pipe(iconv.decodeStream(options.encoding))
      .collect((error, str) => {
        if (error) {
          return callback(error);
        }

        if (options.convert) {
          str = ascii2native(str);
        }

        _.forEach(str.split(/\r?\n/), (source) => {
          const line = new Line(source);

          this[_lines].push(line);

          if (line.isProperty()) {
            this[_properties][line.getKey()] = line.getValue();
          }
        });

        this.emit('load', { input, options });

        return callback(null);
      });
  }

  /**
   * Removes each of the specified <code>keys</code> from this {@link Store}.
   *
   * As a result, all lines that represent these properties will also be removed from the source should this
   * {@link Store} be stored.
   *
   * @param {...string|string[]} keys - the keys of the properties to be removed
   * @return {void}
   * @emits Store#remove
   * @public
   */
  remove(keys) {
    _.chain(arguments)
      .flatten()
      .forEach(keys, (key) => {
        delete this[_properties][key];

        this[_removeLines](key);

        this.emit('remove', { key });
      });
  }

  /**
   * Sets the value of the property in this {@link Store} with the specified <code>key</code> to <code>value</code>.
   *
   * If <code>value</code> is <code>null</code> or is omitted entirely, the property will be removed.
   *
   * As a result, all lines that represent the property will be given the new <code>value</code> (or will be removed)
   * from the source should this {@link Store} be stored.
   *
   * @param {string} key - the key of the property whose value is to be changed
   * @param {*} [value] - the new value for the property (will be cast to a string)
   * @return {void}
   * @emits Store#change
   * @public
   */
  set(key, value) {
    // TODO: Support hash object
    value = value != null ? String(value) : null;

    let lines;

    if (value == null) {
      this.remove(key);
    } else if (this.get(key) === value) {
      this[_properties][key] = value;

      lines = this[_findLines](key);

      if (_.isEmpty(lines)) {
        this[_lines].push(Line.forProperty(key, value));
      } else {
        _.forEach(lines, (line) => {
          line.setValue(value);
        });
      }

      this.emit('change', { key, value });
    }
  }

  /**
   * Returns the number of properties in this {@link Store}.
   *
   * This method only counts unique property keys and will not contain any duplications that may exist within the
   * source.
   *
   * @return {number} The number of properties.
   * @public
   */
  size() {
    return _.size(this[_properties]);
  }

  /**
   * Stores property information in the <code>output</code> stream provided.
   *
   * @param {stream.Writable} output - the output stream to which the properties are to be written
   * @param {Store~options} [options] - the options to be used
   * @param {Function} callback - the function to be called once the properties have been stored or an error occurs
   * @return {void}
   * @emits Store#store
   * @public
   */
  store(output, options, callback) {
    if (_.isFunction(options)) {
      callback = options;
      options = {};
    }

    options = _.defaults({}, options, defaultOptions);

    let str = _.reduce(this[_lines], (memo, line) => {
      return memo + line.getSource() + os.EOL;
    }, '');

    if (options.convert) {
      str = native2ascii(str);
    }

    output.on('error', callback);
    output.end(iconv.encode(str, options.encoding), () => {
      this.emit('store', { options, output });

      callback();
    });
  }

  /**
   * Returns the values for each property in this {@link Store}.
   *
   * This method will only return the value of the last line for each key within the source.
   *
   * @return {string[]} The values for each property.
   * @public
   */
  values() {
    return _.values(this[_properties]);
  }

  /**
   * Returns the index of the first line within the source of this {@link Store} that contains a property with the
   * specified <code>key</code>.
   *
   * @param {string} key - the key of the property whose first line index is to be returned
   * @return {number} The index of the first line to represent the property with <code>key</code> or <code>-1</code> if
   * no matching lines could be found.
   * @private
   */
  [_findLineIndex](key) {
    return _.findIndex(this[_lines], (line) => {
      return line.isProperty() && line.getKey() === key;
    });
  }

  /**
   * Returns all of the lines within the source of this {@link Store} that contain a property with the specified
   * <code>key</code>.
   *
   * @param {string} key - the key of the property whose lines are to be returned
   * @return {Line[]} The lines representing the property with <code>key</code>.
   * @private
   */
  [_findLines](key) {
    return _.filter(this[_lines], (line) => {
      return line.isProperty() && line.getKey() === key;
    });
  }

  /**
   * Removes all lines from the source of this {@link Store} that contain a property with the specified
   * <code>key</code>.
   *
   * @param {string} key - the key of the property whose lines are to be removed
   * @return {void}
   * @private
   */
  [_removeLines](key) {
    let index;

    while ((index = this[_findLineIndex](key)) >= 0) {
      this[_lines] = this[_lines].splice(index, 1);
    }
  }

}

module.exports = Store;

/**
 * The options used by {@link Store#load} and {@link Store#store}.
 *
 * @typedef {Object} Store~options
 * @property {boolean} [convert=true] - <code>true</code> to escape Unicode characters during {@link Store#store} or
 * unescape Unicode characters during {@link Store#load}; otherwise <code>false</code>.
 * @property {string} [encoding="iso-8859-1"] - The character set encoding to be used.
 */

/**
 * Emitted when the value of a property in a {@link Store} has been changed.
 *
 * @event Store#change
 * @type {Object}
 * @property {string} key - The key of the changed property.
 * @property {string} value - The new value of the property.
 */

/**
 * Emitted when a {@link Store} is cleared.
 *
 * @event Store#clear
 */

/**
 * Emitted when properties are loaded into a {@link Store}.
 *
 * @event Store#load
 * @type {Object}
 * @property {stream.Readable} input - The input stream from which the properties were read.
 * @property {Store~options} options - The options that were used to load the properties.
 */

/**
 * Emitted when a property is removed from a {@link Store}.
 *
 * @event Store#remove
 * @type {Object}
 * @property {string} key - The key of the removed property.
 */

/**
 * Emitted when properties in a {@link Store} are stored.
 *
 * @event Store#store
 * @type {Object}
 * @property {Store~options} options - The output stream to which the properties were written.
 * @property {stream.Writable} output - The options that were used to store the properties.
 */
