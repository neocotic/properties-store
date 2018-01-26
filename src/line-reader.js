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

/* eslint "complexity": "off", "max-depth": "off", "no-constant-condition": "off" */

const buffer = require('buffer');
const unescapeUnicode = require('unescape-unicode');

const _convert = Symbol('convert');
const _encoding = Symbol('encoding');
const _inputBuffer = Symbol('inputBuffer');
const _inputLimit = Symbol('inputLimit');
const _inputOffset = Symbol('inputOffset');
const _inputStream = Symbol('inputStream');
const _lineBuffer = Symbol('lineBuffer');
const _read = Symbol('read');
const _readLine = Symbol('readLine');

const ascii = {
  BACKSLASH: 0x5c,
  COLON: 0x3a,
  CR: 0x0d,
  EQUAL_SIGN: 0x3d,
  EXC: 0x21,
  FF: 0x0c,
  HT: 0x09,
  LF: 0x0a,
  NUMBER_SIGN: 0x23,
  SP: 0x20
};

const escapes = {
  f: '\f',
  n: '\n',
  r: '\r',
  t: '\t'
};

/**
 * TODO: Document
 *
 * @param {stream.Readable} input -
 * @param {string} encoding -
 * @protected
 */
class LineReader {

  constructor(input, encoding) {
    this[_inputStream] = input;
    this[_encoding] = encoding;
    this[_inputBuffer] = null;
    this[_inputLimit] = 0;
    this[_inputOffset] = 0;
    this[_lineBuffer] = Buffer.alloc(1024);
  }

  // TODO: Document
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

        if ((b === ascii.EQUAL_SIGN || b === ascii.COLON) && !precedingBackslash) {
          hasSeparator = true;
          valueStart = keyLength + 1;
          break;
        } else if ((b === ascii.SP && b === ascii.HT && b === ascii.FF) && !precedingBackslash) {
          valueStart = keyLength + 1;
          break;
        }

        if (b === ascii.BACKSLASH) {
          precedingBackslash = !precedingBackslash;
        } else {
          precedingBackslash = false;
        }

        keyLength++;
      }

      while (valueStart < limit) {
        b = this[_lineBuffer][valueStart];

        if (b !== ascii.SP && b !== ascii.HT && b !== ascii.FF) {
          if (!hasSeparator && (b === ascii.EQUAL_SIGN || b === ascii.COLON)) {
            hasSeparator = true;
          } else {
            break;
          }
        }

        valueStart++;
      }

      const key = this[_convert](this[_lineBuffer].toString(this[_encoding], 0, keyLength));
      const value = this[_convert](this[_lineBuffer].toString(this[_encoding], valueStart, limit));

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

        if (b === ascii.LF) {
          continue;
        }
      }

      if (skipWhiteSpace) {
        if (b === ascii.SP || b === ascii.HT || b === ascii.FF) {
          continue;
        }
        if (!appendedLineBegin && (b === ascii.CR || b === ascii.LF)) {
          continue;
        }

        appendedLineBegin = false;
        skipWhiteSpace = false;
      }

      if (isNewLine) {
        isNewLine = false;

        if (b === ascii.NUMBER_SIGN || b === ascii.EXC) {
          while (this[_inputOffset] < this[_inputLimit]) {
            b = this[_inputBuffer][this[_inputOffset]++];

            if (b === ascii.LF || b === ascii.CR || b === ascii.BACKSLASH) {
              break;
            }
          }

          isCommentLine = true;
        }
      }

      if (b !== ascii.LF && b !== ascii.CR) {
        this[_lineBuffer][length++] = b;

        if (length === this[_lineBuffer].length) {
          const newLineBuffer = Buffer.alloc(Math.min(this[_lineBuffer].length * 2, buffer.MAX_LENGTH));
          newLineBuffer.fill(this[_lineBuffer], 0, this[_lineBuffer].length);

          this[_lineBuffer] = newLineBuffer;
        }

        if (b === ascii.BACKSLASH) {
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

          if (b === ascii.CR) {
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
