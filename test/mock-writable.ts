/*
 * Copyright (C) 2025 neocotic
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

import { Writable } from "node:stream";

export class MockWritable extends Writable {
  readonly error: Error | undefined;
  #buffer: Buffer = Buffer.alloc(0);
  #length: number = 0;

  constructor({ error }: { error?: Error } = {}) {
    super();

    this.error = error;
  }

  _write(
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    chunk: any,
    encoding: NodeJS.BufferEncoding,
    callback: (error?: Error | null) => void,
  ): void {
    if (this.error) {
      Error.captureStackTrace(this.error);
      callback(this.error);
      return;
    }

    this.#length += chunk.length;
    this.#buffer = Buffer.concat(
      [this.#buffer, Buffer.from(chunk, encoding)],
      this.#length,
    );

    callback();
  }

  get buffer(): Buffer {
    return this.#buffer;
  }
}
