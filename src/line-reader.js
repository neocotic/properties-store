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

/* eslint "complexity": "off", "max-depth": "off", "no-constant-condition": "off" */

const buffer = require('buffer');
const unescapeUnicode = require('unescape-unicode');

const ASCII = require('./constants/ascii');

const _convert = Symbol('convert');
const _inputBuffer = Symbol('inputBuffer');
const _inputLimit = Symbol('inputLimit');
const _inputOffset = Symbol('inputOffset');
const _inputStream = Symbol('inputStream');
const _lineBuffer = Symbol('lineBuffer');
const _options = Symbol('options');
const _read = Symbol('read');
const _readLine = Symbol('readLine');

const escapes = {
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t'
};

/**
 * A <code>LineReader</code> is responsible for reading lines from an input stream and converting and extracting
 * property information into a {@link PropertiesStore}.
 *
 * @param {stream.Readable} input - the input stream to be read
 * @param {Object} options - the options to be used
 * @param {string} options.encoding - the character encoding to be used to read the input
 * @protected
 */
class LineReader {

  constructor(input, options) {
    this[_inputStream] = input;
    this[_options] = options;
    this[_inputBuffer] = null;
    this[_inputLimit] = 0;
    this[_inputOffset] = 0;
    this[_lineBuffer] = Buffer.alloc(1024);
  }

  /**
   * Reads the lines from the input stream and identifies property information before converting and extracting it into
   * the specified <code>properties</code> store.
   *
   * @param {PropertiesStore} properties - the {@link PropertiesStroe} to which any read properties are to be added
   * @return {Promise.<void, Error>} A <code>Promise</code> that is resolved once <code>input</code> has been read.
   * @public
   */
  read(properties) {
    return new Promise((resolve, reject) => {
      // Just in case stream is STDIN when run in TTY context
      if (this[_inputStream].isTTY) {
        resolve();
      } else {
        this[_inputStream].on('error', (error) => {
          reject(error);
        });

        this[_inputStream].on('readable', () => {
          this[_read](properties);
        });

        this[_inputStream].on('end', () => {
          resolve();
        });
      }
    });
  }

  [_convert](str) {
    let result = '';

    for (let i = 0, length = str.length; i < length; i++) {
      let ch = str[i];

      if (ch === '\\') {
        ch = str[++i];

        if (ch === 'u') {
          result += unescapeUnicode(str, i + 1);
          i += 4;
        } else {
          result += escapes[ch] || ch;
        }
      } else {
        result += ch;
      }
    }

    return result;
  }

  [_read](properties) {
    let b;
    let hasSeparator;
    let keyLength;
    let limit;
    let precedingBackslash;
    let valueStart;

    while ((limit = this[_readLine]()) >= 0) {
      b = 0;
      hasSeparator = false;
      keyLength = 0;
      precedingBackslash = false;
      valueStart = limit;

      while (keyLength < limit) {
        b = this[_lineBuffer][keyLength];

        if ((b === ASCII.EQUAL_SIGN || b === ASCII.COLON) && !precedingBackslash) {
          hasSeparator = true;
          valueStart = keyLength + 1;
          break;
        } else if ((b === ASCII.SP || b === ASCII.HT || b === ASCII.FF) && !precedingBackslash) {
          valueStart = keyLength + 1;
          break;
        }

        if (b === ASCII.BACKSLASH) {
          precedingBackslash = !precedingBackslash;
        } else {
          precedingBackslash = false;
        }

        keyLength++;
      }

      while (valueStart < limit) {
        b = this[_lineBuffer][valueStart];

        if (b !== ASCII.SP && b !== ASCII.HT && b !== ASCII.FF) {
          if (!hasSeparator && (b === ASCII.EQUAL_SIGN || b === ASCII.COLON)) {
            hasSeparator = true;
          } else {
            break;
          }
        }

        valueStart++;
      }

      const key = this[_convert](this[_lineBuffer].toString(this[_options].encoding, 0, keyLength));
      const value = this[_convert](this[_lineBuffer].toString(this[_options].encoding, valueStart, limit));

      properties.set(key, value);
    }
  }

  [_readLine]() {
    let appendedLineBegin = false;
    let b = 0;
    let isCommentLine = false;
    let isNewLine = true;
    let length = 0;
    let precedingBackslash = false;
    let skipLineFeed = false;
    let skipWhiteSpace = true;

    while (true) {
      if (this[_inputOffset] >= this[_inputLimit]) {
        this[_inputBuffer] = this[_inputStream].read(8192);
        this[_inputLimit] = this[_inputBuffer] == null ? 0 : this[_inputBuffer].length;
        this[_inputOffset] = 0;

        if (this[_inputLimit] <= 0) {
          if (length === 0 || isCommentLine) {
            return -1;
          }

          if (precedingBackslash) {
            length--;
          }

          return length;
        }
      }

      b = this[_inputBuffer][this[_inputOffset]++];

      if (skipLineFeed) {
        skipLineFeed = false;

        if (b === ASCII.LF) {
          continue;
        }
      }

      if (skipWhiteSpace) {
        if (b === ASCII.SP || b === ASCII.HT || b === ASCII.FF) {
          continue;
        }
        if (!appendedLineBegin && (b === ASCII.CR || b === ASCII.LF)) {
          continue;
        }

        appendedLineBegin = false;
        skipWhiteSpace = false;
      }

      if (isNewLine) {
        isNewLine = false;

        if (b === ASCII.NUMBER_SIGN || b === ASCII.EXC) {
          while (this[_inputOffset] < this[_inputLimit]) {
            b = this[_inputBuffer][this[_inputOffset]++];

            if (b === ASCII.LF || b === ASCII.CR || b === ASCII.BACKSLASH) {
              break;
            }
          }

          isCommentLine = true;
        }
      }

      if (b !== ASCII.LF && b !== ASCII.CR) {
        this[_lineBuffer][length++] = b;

        if (length === this[_lineBuffer].length) {
          const newLineBuffer = Buffer.alloc(Math.min(length * 2, buffer.constants.MAX_LENGTH));
          this[_lineBuffer].copy(newLineBuffer);

          this[_lineBuffer] = newLineBuffer;
        }

        if (b === ASCII.BACKSLASH) {
          precedingBackslash = !precedingBackslash;
        } else {
          precedingBackslash = false;
        }
      } else {
        if (isCommentLine || length === 0) {
          isCommentLine = false;
          isNewLine = true;
          length = 0;
          skipWhiteSpace = true;

          continue;
        }

        if (this[_inputOffset] >= this[_inputLimit]) {
          this[_inputBuffer] = this[_inputStream].read(8192);
          this[_inputLimit] = this[_inputBuffer] == null ? 0 : this[_inputBuffer].length;
          this[_inputOffset] = 0;

          if (this[_inputLimit] <= 0) {
            if (precedingBackslash) {
              length--;
            }

            return length;
          }
        }

        if (precedingBackslash) {
          appendedLineBegin = true;
          precedingBackslash = false;
          skipWhiteSpace = true;
          length--;

          if (b === ASCII.CR) {
            skipLineFeed = true;
          }
        } else {
          return length;
        }
      }
    }
  }

}

module.exports = LineReader;
