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

const _key = Symbol('key');
const _source = Symbol('source');
const _value = Symbol('value');

/**
 * The default string to be used to separate a property key from its value when none already exists or it's new.
 *
 * @private
 * @type {string}
 */
const defaultSeparator = '=';

/**
 * The regular expression used to check and extract property information within the source of a {@link Line}.
 *
 * @private
 * @type {RegExp}
 */
const lineRegexp = /^(\s*[^\s=:#!]+)(\s*[=:]?\s*|\s+)(.*)$/;

/**
 * Contains the source of a single line from a <code>.properties</code> file.
 *
 * @public
 */
class Line {

  /**
   * Creates a {@link Line} instance based on the property <code>key</code> and <code>value</code> provided.
   *
   * @param {string} key - the key of the property to be represented in the {@link Line} (will be trimmed)
   * @param {string} [value=""] - the value of of the property to be represented in the {@link Line} (will be trimmed)
   * @return {Line} The {@link Line} created to contain the property information.
   * @public
   * @static
   */
  static forProperty(key, value) {
    key = key.trim();
    value = value != null ? value.trim() : '';

    return new Line(key + defaultSeparator + value);
  }

  /**
   * Creates an instance of {@link Line} for the specified <code>source</code> string.
   *
   * This is a representation of a source line which has been or can be stored in a <code>properties</code> file. It may
   * contain property information or not (e.g. blank line, comment).
   *
   * @param {string} [source=""] - the source string to be parsed
   * @public
   */
  constructor(source) {
    /**
     * The source string for this {@link Line}.
     *
     * @private
     * @type {string}
     */
    this[_source] = source != null ? source : '';

    const match = this[_source].match(lineRegexp);

    /**
     * The key of the property contained within this {@link Line}.
     *
     * This will be <code>null</code> if this {@link Line} does not contain property information.
     *
     * @private
     * @type {string}
     */
    this[_key] = match ? match[1].trim() : null;

    /**
     * The value of the property contained within this {@link Line}.
     *
     * This will be <code>null</code> if this {@link Line} does not contain property information.
     *
     * @private
     * @type {string}
     */
    this[_value] = match ? match[3].trim() : null;
  }

  /**
   * Returns the key of the property information contained within this {@link Line}.
   *
   * This method will throw an error if this {@link Line} does not contain property information. It's always recommended
   * that {@link Line#isProperty} is called before this method to avoid such errors.
   *
   * @return {string} The key of the property.
   * @throws {Error} If this {@link Line} does not contain property information.
   * @public
   */
  getKey() {
    if (!this.isProperty()) {
      throw new Error('Cannot get key for non-property line');
    }

    return this[_key];
  }

  /**
   * Returns the source of this {@link Line}.
   *
   * @return {string} The source.
   * @public
   */
  getSource() {
    return this[_source];
  }

  /**
   * Returns the value of the property information contained within this {@link Line}.
   *
   * This method will throw an error if this {@link Line} does not contain property information. It's always recommended
   * that {@link Line#isProperty} is called before this method to avoid such errors.
   *
   * @return {string} The value of the property.
   * @throws {Error} If this {@link Line} does not contain property information.
   * @public
   */
  getValue() {
    if (!this.isProperty()) {
      throw new Error('Cannot get value for non-property line');
    }

    return this[_value];
  }

  /**
   * Returns whether this {@link Line} contains property information.
   *
   * @return {boolean} <code>true</code> if property information exists; otherwise <code>false</code>.
   * @public
   */
  isProperty() {
    return this[_key] != null && this[_value] != null;
  }

  /**
   * Sets the value of the property information contained within this {@link Line} to <code>value</code>.
   *
   * This method will throw an error if this {@link Line} does not contain property information. It's always recommended
   * that {@link Line#isProperty} is called before this method to avoid such errors.
   *
   * Only the value segment of the source should be altered by this method, however, a separator may be added if none
   * already existed.
   *
   * @param {string} [value=""] - the value to be set for the property (will be trimmed)
   * @return {void}
   * @throws {Error} If this {@link Line} does not contain property information.
   * @public
   */
  setValue(value) {
    if (!this.isProperty()) {
      throw new Error('Cannot set value for non-property line');
    }

    value = value != null ? value.trim() : '';

    this[_source] = this[_source].replace(lineRegexp, (match, key, separator) => {
      return key + (separator || defaultSeparator) + value;
    });
    this[_value] = value;
  }

}

module.exports = Line;
