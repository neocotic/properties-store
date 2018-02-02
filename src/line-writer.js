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

const escapeUnicode = require('escape-unicode');
const os = require('os');

const ASCII = require('./constants/ascii');

const _convert = Symbol('convert');
const _options = Symbol('options');
const _outputStream = Symbol('outputStream');
const _write = Symbol('write');

const escapes = {
  '=': '\\=',
  ':': '\\:',
  '#': '\\#',
  '!': '\\!',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t'
};

/**
 * A <code>LineWriter</code> is responsible for converting and writing properties from a {@link PropertiesStore} to an
 * output stream.
 *
 * @param {stream.Writable} output - the output stream to be written to
 * @param {Object} options - the options to be used
 * @param {string} options.encoding - the character encoding to be used to write the output
 * @param {boolean} options.escapeUnicode - <code>true</code> to convert all non-ASCII characters to Unicode escapes
 * ("\uxxxx" notation); otherwise <code>false</code>
 * @protected
 */
class LineWriter {

  /**
   * Writes the specified string followed by an OS-specific end-of-line to the <code>output</code> stream provided.
   *
   * @param {stream.Writable} output - the output stream to be written to
   * @param {string} str - the string to be written to <code>output</code>
   * @param {Object} options - the options to be used
   * @param {string} options.encoding - the character encoding to be used to write the output
   * @return {Promise.<void, Error>} A <code>Promise</code> that is resolved once <code>output</code> has been written
   * to.
   * @public
   */
  static writeLine(output, str, options) {
    return new Promise((resolve, reject) => {
      output.write(`${str}${os.EOL}`, options.encoding, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  constructor(output, options) {
    this[_outputStream] = output;
    this[_options] = options;
  }

  /**
   * Writes the properties from the <code>properties</code> store provided to the output stream after converting the
   * key/value pairs.
   *
   * @param {PropertiesStore} properties - the {@link PropertiesStroe} whose properties are to be written
   * @return {Promise.<void, Error>} A <code>Promise</code> that is resolved once <code>output</code> has been written
   * to.
   * @public
   */
  write(properties) {
    return new Promise((resolve, reject) => {
      this[_outputStream].on('error', (error) => {
        reject(error);
      });

      this[_outputStream].on('finish', () => {
        resolve();
      });

      this[_write](properties)
        .catch(reject);
    });
  }

  [_convert](str, escapeSpace) {
    let result = '';

    for (let i = 0, length = str.length; i < length; i++) {
      const ch = str[i];
      const code = ch.charCodeAt(0);

      if (code > ASCII.EQUAL_SIGN && code < ASCII.DEL) {
        result += code === ASCII.BACKSLASH ? '\\\\' : ch;
      } else if (code === ASCII.SP) {
        result += i === 0 || escapeSpace ? `\\${ch}` : ch;
      } else if (escapes[ch]) {
        result += escapes[ch];
      } else if ((code < ASCII.SP || code > ASCII.TILDE) && this[_options].escapeUnicode) {
        result += escapeUnicode(str, i, i + 1);
      } else {
        result += ch;
      }
    }

    return result;
  }

  async [_write](properties) {
    for (let [ key, value ] of properties) {
      key = this[_convert](key, true);
      value = this[_convert](value, false);

      await LineWriter.writeLine(this[_outputStream], `${key}=${value}`, this[_options]);
    }

    this[_outputStream].end();
  }

}

module.exports = LineWriter;
