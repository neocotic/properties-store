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
const moment = require('moment-timezone');
const os = require('os');

const ASCII = require('./constants/ascii');

const _convert = Symbol('convert');
const _options = Symbol('options');
const _outputStream = Symbol('outputStream');
const _write = Symbol('write');
const _writeComments = Symbol('writeComments');
const _writeLine = Symbol('writeLine');
const _writeProperties = Symbol('writeProperties');
const _writeTimestamp = Symbol('writeTimestamp');

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
 * A <code>PropertiesWriter</code> is responsible for converting and writing properties from a {@link PropertiesStore}
 * to an output stream.
 *
 * @param {stream.Writable} output - the output stream to be written to
 * @param {Object} options - the options to be used
 * @param {?string} options.comments - any comments to be written to the output before the properties (may be
 * <code>null</code>)
 * @param {string} options.encoding - the character encoding to be used to write the output
 * @param {boolean} options.escapeUnicode - <code>true</code> to convert all non-ASCII characters to Unicode escapes
 * ("\uxxxx" notation); otherwise <code>false</code>
 * @protected
 */
class PropertiesWriter {

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

      this[_writeProperties](properties)
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

  [_write](str) {
    return new Promise((resolve, reject) => {
      this[_outputStream].write(str, this[_options].encoding, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async [_writeComments]() {
    const { comments } = this[_options];
    if (comments == null) {
      return;
    }

    await this[_write]('#');

    let current = 0;
    let last = 0;
    const length = comments.length;

    while (current < length) {
      const ch = comments[current];
      const code = ch.charCodeAt(0);

      if (((code < ASCII.SP || code > ASCII.TILDE) && this[_options].escapeUnicode) || code === ASCII.LF ||
          code === ASCII.CR) {
        if (last !== current) {
          await this[_write](comments.substring(last, current));
        }

        if ((code < ASCII.SP || code > ASCII.TILDE) && this[_options].escapeUnicode) {
          await this[_write](escapeUnicode(comments, current, current + 1));
        } else {
          await this[_write](os.EOL);

          if (code === ASCII.CR && current !== length - 1 && comments.charCodeAt(current + 1) === ASCII.LF) {
            current++;
          }

          if (current === length - 1 || (comments.charCodeAt(current + 1) !== ASCII.NUMBER_SIGN &&
              comments.charCodeAt(current + 1) !== ASCII.EXC)) {
            await this[_write]('#');
          }
        }

        last = current + 1;
      }

      current++;
    }

    if (last !== current) {
      await this[_write](comments.substring(last, current));
    }

    await this[_write](os.EOL);
  }

  async [_writeLine](str) {
    await this[_write](`${str}${os.EOL}`);
  }

  async [_writeProperties](properties) {
    await this[_writeComments]();
    await this[_writeTimestamp]();

    for (let [ key, value ] of properties) {
      key = this[_convert](key, true);
      value = this[_convert](value, false);

      await this[_writeLine](`${key}=${value}`);
    }

    this[_outputStream].end();
  }

  async [_writeTimestamp]() {
    const timeZone = moment.tz.guess();
    const timestamp = moment().tz(timeZone).format('ddd MMM DD HH:mm:ss z YYYY');

    await this[_writeLine](`#${timestamp}`);
  }

}

module.exports = PropertiesWriter;
