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

// TODO: Complete

const trimStart = require('lodash.trimstart');

const Element = require('./element');

const _key = Symbol('key');
const _value = Symbol('value');

/**
 * TODO: Document
 *
 * @param {string} source -
 * @param {String} key -
 * @param {string} [value=""] -
 * @param {boolean} [trim=true] -
 * @protected
 */
class PropertyElement extends Element {

  /**
   * TODO: Document
   *
   * @param {string} key -
   * @param {string} [value=""] -
   * @return {PropertyElement}
   * @public
   */
  forProperty(key, value) {
    key = key.trim();
    value = trimStart(value);

    return new PropertyElement(`${key}=${value}`, key, value, false);
  }

  constructor(source, key, value, trim = true) {
    super('property', source);

    if (trim) {
      this[_key] = key.trim();
      this[_value] = trimStart(value);
    } else {
      this[_key] = key;
      this[_value] = value != null ? value : '';
    }
  }

  /**
   * TODO: Document
   *
   * @return {string}
   * @public
   */
  get key() {
    return this[_key];
  }

  /**
   * TODO: Document
   *
   * @return {string}
   * @public
   */
  get value() {
    return this[_value];
  }

  /**
   * TODO: Document
   *
   * @param {string} [value=""] -
   * @return {void}
   * @public
   */
  set value(value) {
    value = trimStart(value);

    if (this[_value] === value) {
      return;
    }

    // TODO: Replace value within this.source
    this[_value] = value;
  }

}

module.exports = PropertyElement;
