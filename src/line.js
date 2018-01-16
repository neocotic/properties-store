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

const trimStart = require('lodash.trimstart');

const _key = Symbol('key');
const _source = Symbol('source');
const _value = Symbol('value');

const DEFAULT_COMMENT_PREFIX = '#';
const DEFAULT_PROPERTY_SEPARATOR = '=';
const R_LINE = /^(\s*[^\s=:#!]+)(\s*[=:]?\s*|\s+)(.*)$/;

/**
 * Contains the source of a single line that has been read from and/or can be written to a <code>.properties</code>
 * file.
 *
 * A <code>Line</code> represents a single source line which can be stored in a <code>.properties</code> file. It may
 * contain property information or not (e.g. blank, comment), however, if it does declare a property, this information
 * is be extracted and made available via {@link Line#key} and {@link Line#value}.
 *
 * @example
 * const Line = require("properties-store/src/line");
 *
 * const propertyLine = new Line("foo = bar");
 * propertyLine.source;
 * //=> "foo = bar"
 * propertyLine.property;
 * //=> true
 * propertyLine.key;
 * //=> "foo"
 * propertyLine.value;
 * //=> "bar"
 *
 * const commentLine = new Line("# foo");
 * commentLine.source;
 * //=> "# foo"
 * commentLine.property;
 * //=> false
 *
 * const emptyLine = new Line();
 * emptyLine.source;
 * //=> ""
 * emptyLine.property;
 * //=> false
 * @param {string} [source=""] - the source to be used (may be <code>null</code>)
 * @protected
 */
class Line {

  /**
   * Creates a blank {@link Line}.
   *
   * @example
   * const blankLine = Line.createBlank();
   * blankLine.source;
   * //=> ""
   * blankLine.property;
   * //=> false
   * @return {Line} The created {@link Line} containing nothing.
   * @public
   */
  static createBlank() {
    return new Line();
  }

  /**
   * Creates a {@link Line} with the specified <code>comment</code>.
   *
   * @example
   * const commentLine = Line.createComment("foo");
   * commentLine.source;
   * //=> "# foo"
   * commentLine.property;
   * //=> false
   *
   * const emptyCommentLine = Line.createComment();
   * emptyCommentLine.source;
   * //=> "#"
   * emptyCommentLine.property;
   * //=> false
   * @param {string} [comment=""] - the comment to be used (without leading whitespace - may be <code>null</code>)
   * @return {Line} The created {@link Line} containing <code>comment</code>.
   * @public
   */
  static createComment(comment) {
    comment = trimStart(comment);
    if (comment) {
      comment = ` ${comment}`;
    }

    return new Line(`${DEFAULT_COMMENT_PREFIX}${comment}`);
  }

  /**
   * Creates a {@link Line} declaring a property with the specified <code>key</code> and <code>value</code>.
   *
   * @example
   * const propertyLine = Line.createProperty("foo", "bar");
   * propertyLine.source;
   * //=> "foo=bar"
   * propertyLine.property;
   * //=> true
   * propertyLine.key;
   * //=> "foo"
   * propertyLine.value;
   * //=> "bar"
   *
   * const emptyPropertyLine = Line.createProperty("foo");
   * emptyPropertyLine.source;
   * //=> "foo="
   * emptyPropertyLine.property;
   * //=> true
   * emptyPropertyLine.key;
   * //=> "foo"
   * emptyPropertyLine.value;
   * //=> ""
   * @param {string} key - the key of the property to be declared in the {@link Line} (without leading/trailing
   * whitespace)
   * @param {string} [value=""] - the value of of the property to be declared in the {@link Line} (without leading
   * whitespace - may be <code>null</code>)
   * @return {Line} The created {@link Line} containing the property information.
   * @public
   */
  static createProperty(key, value) {
    key = key.trim();
    value = trimStart(value);

    return new Line(`${key}${DEFAULT_PROPERTY_SEPARATOR}${value}`);
  }

  constructor(source) {
    this[_source] = source != null ? source : '';

    const match = this[_source].match(R_LINE);

    if (match) {
      this[_key] = match[1].trim();
      this[_value] = trimStart(match[3]);
    }
  }

  /**
   * Returns the key of the property declared in this {@link Line}.
   *
   * <code>undefined</code> will be returned if this {@link Line} does not contain any property information. This can be
   * checked via {@link Line#property}.
   *
   * @example
   * const propertyLine = new Line(" foo = bar ");
   * propertyLine.key;
   * //=> "foo"
   *
   * const emptyPropertyLine = new Line("foo");
   * emptyPropertyLine.key;
   * //=> "foo"
   *
   * const commentLine = new Line("# foo");
   * commentLine.key;
   * //=> undefined
   *
   * const emptyLine = new Line();
   * emptyLine.key;
   * //=> undefined
   * @return {?string} The key from the declared property or <code>undefined</code> if there is no property information.
   * @public
   */
  get key() {
    return this[_key];
  }

  /**
   * Returns whether this {@link Line} contains property information.
   *
   * @example
   * const propertyLine = new Line(" foo = bar ");
   * propertyLine.property;
   * //=> true
   *
   * const emptyPropertyLine = new Line("foo");
   * emptyPropertyLine.property;
   * //=> true
   *
   * const commentLine = new Line("# foo");
   * commentLine.property;
   * //=> false
   *
   * const emptyLine = new Line();
   * emptyLine.property;
   * //=> false
   * @return {boolean} <code>true</code> if contains property information; otherwise <code>false</code>.
   * @public
   */
  get property() {
    return this[_key] != null && this[_value] != null;
  }

  /**
   * Returns the source of this {@link Line}.
   *
   * @example
   * const Line = require("properties-store/src/line");
   *
   * const propertyLine = new Line(" foo = bar ");
   * propertyLine.source;
   * //=> " foo = bar "
   *
   * const commentLine = new Line("# foo");
   * commentLine.source;
   * //=> "# foo"
   *
   * const emptyLine = new Line();
   * emptyLine.source;
   * //=> ""
   * @return {string} The source.
   * @public
   */
  get source() {
    return this[_source];
  }

  /**
   * Returns the value of the property declared in this {@link Line}.
   *
   * <code>undefined</code> will be returned if this {@link Line} does not contain any property information. This can be
   * checked via {@link Line#property}.
   *
   * @example
   * const propertyLine = new Line(" foo = bar ");
   * propertyLine.value;
   * //=> "bar "
   *
   * const emptyPropertyLine = new Line("foo");
   * emptyPropertyLine.value;
   * //=> ""
   *
   * const commentLine = new Line("# foo");
   * commentLine.value;
   * //=> undefined
   *
   * const emptyLine = new Line();
   * emptyLine.value;
   * //=> undefined
   * @return {?string} The value from the declared property or <code>undefined</code> if there is no property
   * information.
   * @public
   */
  get value() {
    return this[_value];
  }

  /**
   * Sets the value of the property declared in this {@link Line} to <code>value</code>.
   *
   * Only the value segment of the source should be altered by this method, however, a separator may be added if none
   * already existed.
   *
   * Nothing will happen if this {@link Line} does not contain any property information. This can be checked via
   * {@link Line#property}.
   *
   * @example
   * const propertyLine = new Line(" foo = bar ");
   * propertyLine.value = "BAR ";
   * propertyLine.source;
   * //=> " foo = BAR "
   *
   * const emptyPropertyLine = new Line("foo");
   * emptyPropertyLine.value = "bar";
   * emptyPropertyLine.source;
   * //=> "foo=bar"
   *
   * const commentLine = new Line("# foo");
   * commentLine.value = "bar";
   * commentLine.source;
   * //=> "# foo"
   *
   * const emptyLine = new Line();
   * emptyLine.value = "bar";
   * emptyLine.source;
   * //=> ""
   * @param {string} [value=""] - the value to be set within the declared property (without leading whitespace - may be
   * <code>null</code>)
   * @return {void}
   * @public
   */
  set value(value) {
    value = trimStart(value);

    if (!this[_key] || this[_value] === value) {
      return;
    }

    this[_source] = this[_source].replace(R_LINE, (match, key, separator) => {
      return `${key}${(separator || DEFAULT_PROPERTY_SEPARATOR)}${value}`;
    });
    this[_value] = value;
  }

}

module.exports = Line;
