/*
 * Copyright (C) 2018 Alasdair Mercer
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

const { Readable, Writable } = require('stream');

class MockReadable extends Readable {

  constructor(buffer, error, options) {
    super(options);

    this.buffer = buffer || Buffer.alloc(0);
    this.error = error;
    this._bufferRead = false;
  }

  _read() {
    if (this.error) {
      this.emit('error', this.error);
    }

    if (this.buffer.length === 0) {
      this._bufferRead = true;
    }

    if (this._bufferRead) {
      this.push(null);
    } else {
      this.push(this.buffer);

      this._bufferRead = true;
    }
  }

}

class MockWritable extends Writable {

  constructor(buffer, error, options) {
    super(options);

    this.buffer = buffer || Buffer.alloc(0);
    this.error = error;
    this._length = 0;
  }

  _write(chunk, encoding, callback) {
    if (this.error) {
      return callback(this.error);
    }

    this._length += chunk.length;
    this.buffer = Buffer.concat([ this.buffer, Buffer.from(chunk, encoding) ], this._length);

    return callback();
  }

}

module.exports = {
  MockReadable,
  MockWritable
};
