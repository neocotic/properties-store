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
const R_ELEMENT = /^(\s*[^\s=:#!]+)(\s*[=:]?\s*|\s+)(.*)$/;

/**
 * Contains the source of a single element that has been read from and/or can be written to a <code>.properties</code>
 * file.
 *
 * An <code>Element</code> represents a group of one or more lines which can be stored in a <code>.properties</code>
 * file. It may contain property information or not (e.g. blank, comment), however, if it does declare a property, this
 * information is be extracted and made available via {@link Element#key} and {@link Element#value}.
 *
 * @example
 * const Element = require('properties-store/src/element');
 *
 * const propertyElement = new Element('foo = bar');
 * propertyElement.source;
 * //=> "foo = bar"
 * propertyElement.property;
 * //=> true
 * propertyElement.key;
 * //=> "foo"
 * propertyElement.value;
 * //=> "bar"
 *
 * const commentElement = new Element('# foo');
 * commentElement.source;
 * //=> "# foo"
 * commentElement.property;
 * //=> false
 *
 * const emptyElement = new Element();
 * emptyElement.source;
 * //=> ""
 * emptyElement.property;
 * //=> false
 * @param {string} [source=""] - the source to be used (may be <code>null</code>)
 * @protected
 */
class Element {

  /**
   * Creates a blank {@link Element}.
   *
   * @example
   * const blankElement = Element.createBlank();
   * blankElement.source;
   * //=> ""
   * blankElement.property;
   * //=> false
   * @return {Element} The created {@link Element} containing nothing.
   * @public
   */
  static createBlank() {
    return new Element();
  }

  /**
   * Creates an {@link Element} with the specified <code>comment</code>.
   *
   * @example
   * const commentElement = Element.createComment('foo');
   * commentElement.source;
   * //=> "# foo"
   * commentElement.property;
   * //=> false
   *
   * const emptyCommentElement = Element.createComment();
   * emptyCommentElement.source;
   * //=> "#"
   * emptyCommentElement.property;
   * //=> false
   * @param {string} [comment=""] - the comment to be used (without leading whitespace - may be <code>null</code>)
   * @return {Element} The created {@link Element} containing <code>comment</code>.
   * @public
   */
  static createComment(comment) {
    comment = trimStart(comment);
    if (comment) {
      comment = ` ${comment}`;
    }

    return new Element(`${DEFAULT_COMMENT_PREFIX}${comment}`);
  }

  /**
   * Creates an {@link Element} declaring a property with the specified <code>key</code> and <code>value</code>.
   *
   * @example
   * const propertyElement = Element.createProperty('foo', 'bar');
   * propertyElement.source;
   * //=> "foo=bar"
   * propertyElement.property;
   * //=> true
   * propertyElement.key;
   * //=> "foo"
   * propertyElement.value;
   * //=> "bar"
   *
   * const emptyPropertyElement = Element.createProperty('foo');
   * emptyPropertyElement.source;
   * //=> "foo="
   * emptyPropertyElement.property;
   * //=> true
   * emptyPropertyElement.key;
   * //=> "foo"
   * emptyPropertyElement.value;
   * //=> ""
   * @param {string} key - the key of the property to be declared in the {@link Element} (without leading/trailing
   * whitespace)
   * @param {string} [value=""] - the value of of the property to be declared in the {@link Element} (without leading
   * whitespace - may be <code>null</code>)
   * @return {Element} The created {@link Element} containing the property information.
   * @public
   */
  static createProperty(key, value) {
    key = key.trim();
    value = trimStart(value);

    return new Element(`${key}${DEFAULT_PROPERTY_SEPARATOR}${value}`);
  }

  constructor(source) {
    this[_source] = source != null ? source : '';

    const match = this[_source].match(R_ELEMENT);

    if (match) {
      this[_key] = match[1].trim();
      this[_value] = trimStart(match[3]);
    }
  }

  /**
   * Returns the key of the property declared in this {@link Element}.
   *
   * <code>undefined</code> will be returned if this {@link Element} does not contain any property information. This can
   * be checked via {@link Element#property}.
   *
   * @example
   * const propertyElement = new Element(' foo = bar ');
   * propertyElement.key;
   * //=> "foo"
   *
   * const emptyPropertyElement = new Element('foo');
   * emptyPropertyElement.key;
   * //=> "foo"
   *
   * const commentElement = new Element('# foo');
   * commentElement.key;
   * //=> undefined
   *
   * const emptyElement = new Element();
   * emptyElement.key;
   * //=> undefined
   * @return {?string} The key from the declared property or <code>undefined</code> if there is no property information.
   * @public
   */
  get key() {
    return this[_key];
  }

  /**
   * Returns whether this {@link Element} contains property information.
   *
   * @example
   * const propertyElement = new Element(' foo = bar ');
   * propertyElement.property;
   * //=> true
   *
   * const emptyPropertyElement = new Element('foo');
   * emptyPropertyElement.property;
   * //=> true
   *
   * const commentElement = new Element('# foo');
   * commentElement.property;
   * //=> false
   *
   * const emptyElement = new Element();
   * emptyElement.property;
   * //=> false
   * @return {boolean} <code>true</code> if contains property information; otherwise <code>false</code>.
   * @public
   */
  get property() {
    return this[_key] != null && this[_value] != null;
  }

  /**
   * Returns the source of this {@link Element}.
   *
   * @example
   * const propertyElement = new Element(' foo = bar ');
   * propertyElement.source;
   * //=> " foo = bar "
   *
   * const commentElement = new Element('# foo');
   * commentElement.source;
   * //=> "# foo"
   *
   * const emptyElement = new Element();
   * emptyElement.source;
   * //=> ""
   * @return {string} The source.
   * @public
   */
  get source() {
    return this[_source];
  }

  /**
   * Returns the value of the property declared in this {@link Element}.
   *
   * <code>undefined</code> will be returned if this {@link Element} does not contain any property information. This can
   * be checked via {@link Element#property}.
   *
   * @example
   * const propertyElement = new Element(' foo = bar ');
   * propertyElement.value;
   * //=> "bar "
   *
   * const emptyPropertyElement = new Element('foo');
   * emptyPropertyElement.value;
   * //=> ""
   *
   * const commentElement = new Element('# foo');
   * commentElement.value;
   * //=> undefined
   *
   * const emptyElement = new Element();
   * emptyElement.value;
   * //=> undefined
   * @return {?string} The value from the declared property or <code>undefined</code> if there is no property
   * information.
   * @public
   */
  get value() {
    return this[_value];
  }

  /**
   * Sets the value of the property declared in this {@link Element} to <code>value</code>.
   *
   * Only the value segment of the source should be altered by this method, however, a separator may be added if none
   * already existed.
   *
   * Nothing will happen if this {@link Element} does not contain any property information. This can be checked via
   * {@link Element#property}.
   *
   * @example
   * const propertyElement = new Element(' foo = bar ');
   * propertyElement.value = 'BAR ';
   * propertyElement.source;
   * //=> " foo = BAR "
   *
   * const emptyPropertyElement = new Element('foo');
   * emptyPropertyElement.value = 'bar';
   * emptyPropertyElement.source;
   * //=> "foo=bar"
   *
   * const commentElement = new Element('# foo');
   * commentElement.value = 'bar';
   * commentElement.source;
   * //=> "# foo"
   *
   * const emptyElement = new Element();
   * emptyElement.value = 'bar';
   * emptyElement.source;
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

    this[_source] = this[_source].replace(R_ELEMENT, (match, key, separator) => {
      return `${key}${(separator || DEFAULT_PROPERTY_SEPARATOR)}${value}`;
    });
    this[_value] = value;
  }

}

module.exports = Element;
