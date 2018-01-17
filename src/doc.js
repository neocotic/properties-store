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

const Line = require('./line');

const _lines = Symbol('lines');

/**
 * A <code>Doc</code> represents a persistent set of lines backing a {@link PropertiesStore} which can be iterated over
 * as <code>Doc</code> itself is iterable.
 *
 * Contains some useful methods intended for querying and modifying lines that represent properties to help the
 * {@link PropertiesStore} synchronize itself with the <code>Doc</code>.
 *
 * @example
 * const Doc = require("properties-store/src/doc");
 * const Line = require("properties-store/src/line");
 *
 * const doc = new Doc();
 * doc.add(Line.createComment("foo"));
 * doc.add(Line.createBlank());
 * doc.add(Line.createProperty("foo", "bar"));
 * doc.add(Line.createProperty("fu", "baz"));
 *
 * Array.from(doc);
 * //=> [Line(source = "# foo"), Line(source = ""), Line(source = "foo=bar"), Line(source = "fu=baz")]
 * @protected
 */
class Doc {

  /**
   * Parses all lines from the specified <code>source</code> and executes the specified <code>callback</code> function
   * once per parsed {@link Line}.
   *
   * Nothing happens if <code>source</code> is <code>null</code>.
   *
   * @example
   * Doc.parse("# foo\n\nfoo = bar\nfu = baz", (line) => console.log(line));
   * //=> Line(source = "# foo")
   * //=> Line(source = "")
   * //=> Line(source = "foo = bar")
   * //=> Line(source = "fu = baz")
   * @param {?string} source - the string to be parsed (may be <code>null</code>)
   * @param {Line~ParseCallback} callback - the function to execute for each {@link Line}
   * @param {Object} [thisArg] - the value to use as <code>this</code> when executing <code>callback</code>
   * @return {void}
   * @public
   */
  static parse(source, callback, thisArg) {
    // TODO: Improve parsing logic to closer match Java's properties specifications: https://en.wikipedia.org/wiki/.properties#Format
    if (source == null) {
      return;
    }

    source.split(/\r?\n/).forEach((lineSource, index) => {
      callback.call(thisArg, new Line(lineSource), index);
    });
  }

  constructor() {
    this[_lines] = [];
  }

  /**
   * Adds the specified <code>line</code> to this {@link Doc}.
   *
   * Nothing happens if <code>line</code> is <code>null</code>.
   *
   * @example
   * const doc = new Doc();
   *
   * doc.add(Line.createProperty("foo", "bar"));
   * doc.add(null);
   *
   * Array.from(doc);
   * //=> [Line(source = "foo=bar")]
   * @param {?Line} line - the {@link Line} to be added (may be <code>null</code>)
   * @return {Doc} A reference to this {@link Doc}.
   * @public
   */
  add(line) {
    if (line) {
      this[_lines].push(line);
    }

    return this;
  }

  /**
   * Removes all lines from this {@link Doc}.
   *
   * @example
   * const doc = new Doc();
   * doc.add(Line.createComment("foo"));
   * doc.add(Line.createBlank());
   * doc.add(Line.createProperty("foo", "bar"));
   * doc.add(Line.createProperty("fu", "baz"));
   *
   * doc.clear();
   * doc.size;
   * //=> 0
   * @return {void}
   * @public
   */
  clear() {
    this[_lines] = [];
  }

  /**
   * Removes all lines representing the property with the specified <code>key</code> from this {@link Doc}.
   *
   * <code>key</code> is case sensitive.
   *
   * @example
   * const doc = new Doc();
   * doc.add(Line.createProperty("foo", "rab"));
   * doc.add(Line.createProperty("foo", "bar"));
   * doc.add(Line.createProperty("fu", "baz"));
   *
   * doc.delete("foo");
   * //=> true
   * Array.from(doc);
   * //=> [Line(source = "fu=baz")]
   *
   * doc.delete("FU");
   * //=> false
   * Array.from(doc);
   * //=> [Line(source = "fu=baz")]
   *
   * doc.delete("fizz");
   * //=> false
   * Array.from(doc);
   * //=> [Line(source = "fu=baz")]
   *
   * doc.delete(null);
   * //=> false
   * Array.from(doc);
   * //=> [Line(source = "fu=baz")]
   * @param {?string} key - the key of the property whose lines are to be removed (may be <code>null</code>)
   * @return {boolean} <code>true</code> if a {@link Line} representing the property with <code>key</code> was
   * successfully removed; otherwise <code>false</code>.
   * @public
   */
  delete(key) {
    const oldLength = this[_lines].length;

    this[_lines] = this[_lines].filter((line, index) => {
      return !line.property || line.key !== key;
    });

    return oldLength !== this[_lines].length;
  }

  /**
   * Executes the specified <code>callback</code> function once per each {@link Line} in this {@link Doc}.
   *
   * @example
   * const doc = new Doc();
   * doc.add(Line.createComment("foo"));
   * doc.add(Line.createBlank());
   * doc.add(Line.createProperty("foo", "bar"));
   * doc.add(Line.createProperty("fu", "baz"));
   *
   * doc.forEach((line) => console.log(line));
   * //=> Line(source = "# foo")
   * //=> Line(source = "")
   * //=> Line(source = "foo=bar")
   * //=> Line(source = "fu=baz")
   * @param {Doc~ForEachCallback} callback - the function to execute for each {@link Line}
   * @param {Object} [thisArg] - the value to use as <code>this</code> when executing <code>callback</code>
   * @return {void}
   * @public
   */
  forEach(callback, thisArg) {
    this[_lines].forEach((line, index) => {
      callback.call(thisArg, line, index, this);
    });
  }

  /**
   * Returns the last {@link Line} representing the property with the specified <code>key</code> in this {@link Doc}.
   *
   * <code>key</code> is case sensitive.
   *
   * @example
   * const doc = new Doc();
   * doc.add(Line.createProperty("foo", "rab"));
   * doc.add(Line.createProperty("foo", "bar"));
   *
   * doc.get("foo");
   * //=> Line(source = "foo=bar")
   * doc.get("FOO");
   * //=> undefined
   * doc.get("fu");
   * //=> undefined
   * doc.get(null);
   * //=> undefined
   * @param {?string} key - the key of the property whose last {@link Line} is to be returned (may be <code>null</code>)
   * @return {?Line} The last {@link Line} representing the property with <code>key</code> or <code>undefined</code> if
   * none exists.
   * @public
   */
  get(key) {
    const lines = this[_lines].filter((line) => {
      return line.property && line.key === key;
    });

    return lines[lines.length - 1];
  }

  /**
   * Returns whether a {@link Line} representing the property with the specified <code>key</code> exists within this
   * {@link Doc}.
   *
   * <code>key</code> is case sensitive.
   *
   * @example
   * const doc = new Doc();
   * doc.add(Line.createProperty("foo", "bar"));
   *
   * doc.has("foo");
   * //=> true
   * doc.has("FOO");
   * //=> false
   * doc.has("fu");
   * //=> false
   * doc.has(null);
   * //=> false
   * @param {?string} key - the key of the property to be checked (may be <code>null</code>)
   * @return {boolean} <code>true</code> if a {@link Line} representing the property with <code>key</code> exists;
   * otherwise <code>false</code>.
   * @public
   */
  has(key) {
    return this[_lines].some((line) => {
      return line.property && line.key === key;
    });
  }

  *[Symbol.iterator]() {
    yield* this[_lines];
  }

  /**
   * Returns the number of lines in this {@link Doc}.
   *
   * @example
   * const doc = new Doc();
   * doc.size;
   * //=> 0
   *
   * doc.add(Line.createComment("foo"));
   * doc.add(Line.createBlank());
   * doc.add(Line.createProperty("foo", "bar"));
   * doc.add(Line.createProperty("fu", "baz"));
   *
   * doc.size;
   * //=> 4
   * @return {number} The number of lines.
   * @public
   */
  get size() {
    return this[_lines].length;
  }

}

module.exports = Doc;

/**
 * The callback function that is passed to {@link Doc#forEach}.
 *
 * @protected
 * @callback Doc~ForEachCallback
 * @param {Line} line - the {@link Line}
 * @param {number} index - the line index
 * @param {Doc} doc - the {@link Doc}
 * @return {void}
 */

/**
 * The callback function that is passed to {@link Doc.parse}.
 *
 * @protected
 * @callback Doc~ParseCallback
 * @param {Line} line - the {@link Line}
 * @param {number} index - the line index
 * @return {void}
 */
