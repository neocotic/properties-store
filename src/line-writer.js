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

const escapeUnicode = require('escape-unicode');
const os = require('os');

const _convert = Symbol('convert');
const _encoding = Symbol('encoding');
const _outputStream = Symbol('outputStream');
const _write = Symbol('write');
const _writeLine = Symbol('writeLine');

const ascii = {
  BACKSLASH: 0x5c,
  DEL: 0x7f,
  EQUAL_SIGN: 0x3d,
  SP: 0x20,
  TILDE: 0x7f
};

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
 * TODO: Document
 *
 * @param {stream.Writable} output -
 * @param {string} encoding -
 * @protected
 */
class LineWriter {

  constructor(output, encoding) {
    this[_outputStream] = output;
    this[_encoding] = encoding;
  }

  // TODO: Document
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

      if (code > ascii.EQUAL_SIGN && code < ascii.DEL) {
        result += code === ascii.BACKSLASH ? '\\\\' : ch;
      } else if (code === ascii.SP) {
        result += i === 0 || escapeSpace ? `\\${ch}` : ch;
      } else if (escapes[ch]) {
        result += escapes[ch];
      } else if (code < ascii.SP || code > ascii.TILDE) {
        result += escapeUnicode(str, i, i + 1);
      } else {
        result += ch;
      }
    }

    return result;
  }

  async [_write](properties) {
    for (const [ key, value ] of properties) {
      await this[_writeLine](key, value);
    }

    this[_outputStream].end();
  }

  [_writeLine](key, value) {
    key = this[_convert](key, true);
    value = this[_convert](value, false);

    return new Promise((resolve, reject) => {
      this[_outputStream].write(`${key}=${value}${os.EOL}`, this[_encoding], (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

}

module.exports = LineWriter;
