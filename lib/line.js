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
 * TODO: Document
 *
 * @param {string} source -
 * @public
 * @class Line
 */
var Line = function(source) {
  /**
   * TODO: Document
   *
   * @private
   * @type {string}
   */
  this._source = source
}

/**
 * TODO: Document
 *
 * @param {string} key -
 * @param {string} value -
 * @return {Line}
 * @public
 * @static
 */
Line.forProperty = function(key, value) {
  return new Line(key + '=' + value)
}

/**
 * TODO: Document
 *
 * @return {string}
 * @throws {Error}
 * @public
 */
Line.prototype.getKey = function() {
  if (this.isProperty()) {
    throw new Error('Cannot get key for non-property line')
  }

  // TODO: Complete
}

/**
 * TODO: Document
 *
 * @return {string}
 * @public
 */
Line.prototype.getSource = function() {
  return this._source
}

/**
 * TODO: Document
 *
 * @return {string}
 * @throws {Error}
 * @public
 */
Line.prototype.getValue = function() {
  if (this.isProperty()) {
    throw new Error('Cannot get value for non-property line')
  }

  // TODO: Complete
}

/**
 * TODO: Document
 *
 * @return {boolean}
 * @public
 */
Line.prototype.isProperty = function() {
  // TODO: Complete
}

/**
 * TODO: Document
 *
 * @param {string} value -
 * @return {void}
 * @throws {Error}
 * @public
 */
Line.prototype.setValue = function(value) {
  if (this.isProperty()) {
    throw new Error('Cannot set value for non-property line')
  }

  // TODO: Complete
}

module.exports = Line
