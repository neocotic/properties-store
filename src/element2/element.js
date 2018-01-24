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

const _source = Symbol('source');
const _type = Symbol('type');

/**
 * TODO: Document
 *
 * @param {string} type -
 * @param {string} [source=""] -
 * @protected
 */
class Element {

  constructor(type, source) {
    this[_type] = type;
    this[_source] = source != null ? source : '';
  }

  /**
   * TODO: Document
   *
   * @return {string}
   * @public
   */
  get source() {
    return this[_source];
  }

  /**
   * TODO: Document
   *
   * @param {string} [source=""] -
   * @return {void}
   * @protected
   */
  set source(source) {
    this[_source] = source != null ? source : '';
  }

  /**
   * TODO: Document
   *
   * @return {string}
   * @public
   */
  get type() {
    return this[_type];
  }

}

module.exports = Element;
