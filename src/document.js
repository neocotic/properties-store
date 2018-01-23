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

const Element = require('./element');

const _elements = Symbol('elements');

/**
 * A <code>Document</code> represents a persistent set of elements backing a {@link PropertiesStore} which can be
 * iterated over as <code>Document</code> itself is iterable.
 *
 * Contains some useful methods intended for querying and modifying elements that represent properties to help the
 * {@link PropertiesStore} synchronize itself with the <code>Document</code>.
 *
 * @example
 * const Document = require('properties-store/src/document');
 * const Element = require('properties-store/src/element');
 *
 * const document = new Document();
 * document.add(Element.createComment('foo'));
 * document.add(Element.createBlank());
 * document.add(Element.createProperty('foo', 'bar'));
 * document.add(Element.createProperty('fu', 'baz'));
 *
 * Array.from(document);
 * //=> [Element(source = "# foo"), Element(source = ""), Element(source = "foo=bar"), Element(source = "fu=baz")]
 * @protected
 */
class Document {

  /**
   * Parses all elements from the specified <code>source</code> and executes the specified <code>callback</code>
   * function once per parsed {@link Element}.
   *
   * Nothing happens if <code>source</code> is <code>null</code>.
   *
   * @example
   * Document.parse('# foo\n\nfoo = bar\nfu = baz', (element) => console.log(element));
   * //=> Element(source = "# foo")
   * //=> Element(source = "")
   * //=> Element(source = "foo = bar")
   * //=> Element(source = "fu = baz")
   * @param {?string} source - the string to be parsed (may be <code>null</code>)
   * @param {Document~ParseCallback} callback - the function to execute for each {@link Element}
   * @param {Object} [thisArg] - the value to use as <code>this</code> when executing <code>callback</code>
   * @return {void}
   * @public
   */
  static parse(source, callback, thisArg) {
    if (source == null) {
      return;
    }

    source.split(/\r?\n/).forEach((elementSource, index) => {
      callback.call(thisArg, new Element(elementSource), index);
    });
  }

  constructor() {
    this[_elements] = [];
  }

  /**
   * Adds the specified <code>element</code> to this {@link Document}.
   *
   * Nothing happens if <code>element</code> is <code>null</code>.
   *
   * @example
   * const document = new Document();
   *
   * document.add(Element.createProperty('foo', 'bar'));
   * document.add(null);
   *
   * Array.from(document);
   * //=> [Element(source = "foo=bar")]
   * @param {?Element} element - the {@link Element} to be added (may be <code>null</code>)
   * @return {Document} A reference to this {@link Document}.
   * @public
   */
  add(element) {
    if (element) {
      this[_elements].push(element);
    }

    return this;
  }

  /**
   * Removes all elements from this {@link Document}.
   *
   * @example
   * const document = new Document();
   * document.add(Element.createComment('foo'));
   * document.add(Element.createBlank());
   * document.add(Element.createProperty('foo', 'bar'));
   * document.add(Element.createProperty('fu', 'baz'));
   *
   * document.clear();
   * document.size;
   * //=> 0
   * @return {void}
   * @public
   */
  clear() {
    this[_elements] = [];
  }

  /**
   * Removes all elements representing the property with the specified <code>key</code> from this {@link Document}.
   *
   * <code>key</code> is case sensitive.
   *
   * @example
   * const document = new Document();
   * document.add(Element.createProperty('foo', 'rab'));
   * document.add(Element.createProperty('foo', 'bar'));
   * document.add(Element.createProperty('fu', 'baz'));
   *
   * document.delete('foo');
   * //=> true
   * Array.from(document);
   * //=> [Element(source = "fu=baz")]
   *
   * document.delete('FU');
   * //=> false
   * Array.from(document);
   * //=> [Element(source = "fu=baz")]
   *
   * document.delete('fizz');
   * //=> false
   * Array.from(document);
   * //=> [Element(source = "fu=baz")]
   *
   * document.delete(null);
   * //=> false
   * Array.from(document);
   * //=> [Element(source = "fu=baz")]
   * @param {?string} key - the key of the property whose elements are to be removed (may be <code>null</code>)
   * @return {boolean} <code>true</code> if an {@link Element} representing the property with <code>key</code> was
   * successfully removed; otherwise <code>false</code>.
   * @public
   */
  delete(key) {
    const oldLength = this[_elements].length;

    this[_elements] = this[_elements].filter((element) => {
      return !element.property || element.key !== key;
    });

    return oldLength !== this[_elements].length;
  }

  /**
   * Executes the specified <code>callback</code> function once per each {@link Element} in this {@link Document}.
   *
   * @example
   * const document = new Document();
   * document.add(Element.createComment('foo'));
   * document.add(Element.createBlank());
   * document.add(Element.createProperty('foo', 'bar'));
   * document.add(Element.createProperty('fu', 'baz'));
   *
   * document.forEach((element) => console.log(element));
   * //=> Element(source = "# foo")
   * //=> Element(source = "")
   * //=> Element(source = "foo=bar")
   * //=> Element(source = "fu=baz")
   * @param {Document~ForEachCallback} callback - the function to execute for each {@link Element}
   * @param {Object} [thisArg] - the value to use as <code>this</code> when executing <code>callback</code>
   * @return {void}
   * @public
   */
  forEach(callback, thisArg) {
    this[_elements].forEach((element, index) => {
      callback.call(thisArg, element, index, this);
    });
  }

  /**
   * Returns the last {@link Element} representing the property with the specified <code>key</code> in this
   * {@link Document}.
   *
   * <code>key</code> is case sensitive.
   *
   * @example
   * const document = new Document();
   * document.add(Element.createProperty('foo', 'rab'));
   * document.add(Element.createProperty('foo', 'bar'));
   *
   * document.get('foo');
   * //=> Element(source = "foo=bar")
   * document.get('FOO');
   * //=> undefined
   * document.get('fu');
   * //=> undefined
   * document.get(null);
   * //=> undefined
   * @param {?string} key - the key of the property whose last {@link Element} is to be returned (may be
   * <code>null</code>)
   * @return {?Element} The last {@link Element} representing the property with <code>key</code> or
   * <code>undefined</code> if none exists.
   * @public
   */
  get(key) {
    const elements = this[_elements].filter((element) => {
      return element.property && element.key === key;
    });

    return elements[elements.length - 1];
  }

  /**
   * Returns whether a {@link Element} representing the property with the specified <code>key</code> exists within this
   * {@link Document}.
   *
   * <code>key</code> is case sensitive.
   *
   * @example
   * const document = new Document();
   * document.add(Element.createProperty('foo', 'bar'));
   *
   * document.has('foo');
   * //=> true
   * document.has('FOO');
   * //=> false
   * document.has('fu');
   * //=> false
   * document.has(null);
   * //=> false
   * @param {?string} key - the key of the property to be checked (may be <code>null</code>)
   * @return {boolean} <code>true</code> if a {@link Element} representing the property with <code>key</code> exists;
   * otherwise <code>false</code>.
   * @public
   */
  has(key) {
    return this[_elements].some((element) => {
      return element.property && element.key === key;
    });
  }

  *[Symbol.iterator]() {
    yield* this[_elements];
  }

  /**
   * Returns the number of elements in this {@link Document}.
   *
   * @example
   * const document = new Document();
   * document.size;
   * //=> 0
   *
   * document.add(Element.createComment('foo'));
   * document.add(Element.createBlank());
   * document.add(Element.createProperty('foo', 'bar'));
   * document.add(Element.createProperty('fu', 'baz'));
   *
   * document.size;
   * //=> 4
   * @return {number} The number of elements.
   * @public
   */
  get size() {
    return this[_elements].length;
  }

}

module.exports = Document;

/**
 * The callback function that is passed to {@link Document#forEach}.
 *
 * @protected
 * @callback Document~ForEachCallback
 * @param {element} element - the {@link Element}
 * @param {number} index - the element index
 * @param {Document} document - the {@link Document}
 * @return {void}
 */

/**
 * The callback function that is passed to {@link Document.parse}.
 *
 * @protected
 * @callback Document~ParseCallback
 * @param {Element} element - the {@link Element}
 * @param {number} index - the element index
 * @return {void}
 */
