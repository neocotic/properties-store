/*
 * Copyright (C) 2016 Alasdair Mercer, Skelp
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

'use strict'

/**
 * Creates an instance of {@link Line} for the specified <code>source</code> string.
 *
 * This is a representation of a source line which has been or can be stored in a <code>properties</code> file. It may
 * contain property information or not (e.g. blank line, comment).
 *
 * @param {string} [source=""] - the source string to be parsed
 * @public
 * @class Line
 */
var Line = function(source) {
  /**
   * The source string for this {@link Line}.
   *
   * @private
   * @type {string}
   */
  this._source = source != null ? source : ''

  var match = !Line.COMMENT_REGEXP.test(this._source) ? this._source.match(Line.PROPERTY_REGEXP) : null

  /**
   * The key of the property contained within this {@link Line}.
   *
   * This will be <code>null</code> if this {@link Line} does not contain property information.
   *
   * @private
   * @type {string}
   */
  this._key = match ? match[1].trim() : null

  /**
   * The value of the property contained within this {@link Line}.
   *
   * This will be <code>null</code> if this {@link Line} does not contain property information.
   *
   * @private
   * @type {string}
   */
  this._value = match ? match[3].trim() : null
}

/**
 * The regular expression used to check whether the source of a {@link Line} represents a comment.
 *
 * @public
 * @static
 * @type {RegExp}
 */
Line.COMMENT_REGEXP = /^\s*[#!].*/

/**
 * The default string to be used to separate a property key from its value when none already exists or it's new.
 *
 * @public
 * @static
 * @type {string}
 */
Line.DEFAULT_SEPARATOR = '='

/**
 * The regular expression used to check and extract property information within the source of a {@link Line}.
 *
 * @public
 * @static
 * @type {RegExp}
 */
Line.PROPERTY_REGEXP = /^(\s*[^\s=:]+)(\s*[=:]?\s*|\s+)(.*)$/

/**
 * Creates a {@link Line} instance based on the property <code>key</code> and <code>value</code> provided.
 *
 * @param {string} key - the key of the property to be represented in the {@link Line} (will be trimmed)
 * @param {string} [value=""] - the value of of the property to be represented in the {@link Line} (will be trimmed)
 * @return {Line} The {@link Line} created to contain the property information.
 * @public
 * @static
 */
Line.forProperty = function(key, value) {
  key = key.trim()
  value = value != null ? value.trim() : ''

  return new Line(key + Line.DEFAULT_SEPARATOR + value)
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
Line.prototype.getKey = function() {
  if (!this.isProperty()) {
    throw new Error('Cannot get key for non-property line')
  }

  return this._key
}

/**
 * Returns the source of this {@link Line}.
 *
 * @return {string} The source.
 * @public
 */
Line.prototype.getSource = function() {
  return this._source
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
Line.prototype.getValue = function() {
  if (!this.isProperty()) {
    throw new Error('Cannot get value for non-property line')
  }

  return this._value
}

/**
 * Returns whether this {@link Line} contains property information.
 *
 * @return {boolean} <code>true</code> if property information exists; otherwise <code>false</code>.
 * @public
 */
Line.prototype.isProperty = function() {
  return this._key != null && this._value != null
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
Line.prototype.setValue = function(value) {
  if (!this.isProperty()) {
    throw new Error('Cannot set value for non-property line')
  }

  value = value != null ? value.trim() : ''

  this._source = this._source.replace(Line.PROPERTY_REGEXP, function(match, key, separator) {
    return key + (separator || Line.DEFAULT_SEPARATOR) + value
  })
  this._value = value
}

module.exports = Line
