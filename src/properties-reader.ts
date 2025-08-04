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

import { constants as bufferConstants } from "node:buffer";
import {
  type Replacer,
  composeReplacer,
  replaceChars,
  replaceUnescaped,
  unescapeUnicode,
} from "unescape-unicode";
import { constants as asciiConstants } from "./ascii.js";
import type { PropertiesStore } from "./properties-store.js";

/**
 * The options that can be provided to {@link PropertiesReader}.
 */
export interface PropertiesReaderOptions {
  /**
   * The character encoding to be used to read the input.
   */
  encoding: NodeJS.BufferEncoding;
  /**
   * The input stream to be read.
   */
  stream: NodeJS.ReadableStream;
}

/**
 * The {@link Replacer} used when converting Unicode escapes ("\uxxxx" notation) to their corresponding characters to
 * also convert other common escape sequences and handle any unrecognized escape sequences by just ignoring the
 * backslash.
 */
const replacer: Replacer = composeReplacer(
  replaceChars({
    f: "\f",
    n: "\n",
    r: "\r",
    t: "\t",
  }),
  replaceUnescaped(),
);

/**
 * Responsible for reading lines from an input stream and converting and extracting property information into a
 * {@link PropertiesStore}.
 */
export class PropertiesReader {
  /**
   * The character encoding to be used to read the input.
   */
  readonly #encoding: NodeJS.BufferEncoding;
  /**
   * The buffer used to read input from the input stream.
   */
  #inputBuffer = Buffer.alloc(0);
  /**
   * The limit of the input buffer.
   */
  #inputLimit = 0;
  /**
   * The offset of the input buffer.
   */
  #inputOffset = 0;
  /**
   * The buffer used to store the current line being read from the input stream.
   */
  #lineBuffer = Buffer.alloc(1024);
  /**
   * The input stream to be read.
   */
  readonly #stream: NodeJS.ReadableStream;

  /**
   * Creates an instance of {@link PropertiesReader} using the `options` provided.
   *
   * @param options The options to be used.
   */
  constructor(options: PropertiesReaderOptions) {
    const { encoding, stream } = options;

    this.#encoding = encoding;
    this.#stream = stream;
  }

  /**
   * Reads the lines from the input stream and identifies property information before converting and extracting it into
   * the specified properties `store`.
   *
   * @param store The {@link PropertiesStore} to which any read properties are to be set.
   */
  read(store: PropertiesStore): Promise<void> {
    return new Promise((resolve, reject) => {
      if ("isTTY" in this.#stream && this.#stream.isTTY === true) {
        resolve();
      } else {
        this.#stream.on("error", reject);
        this.#stream.on("readable", () => this.#readProperties(store));
        this.#stream.on("end", resolve);
      }
    });
  }

  /**
   * Converts any Unicode escapes within the specified `input` string to their corresponding characters.
   *
   * @param input The input string to be converted.
   * @return The converted string.
   */
  #convert(input: string): string {
    return unescapeUnicode(input, { replacer });
  }

  /**
   * Reads a line from the input stream into a `Buffer` and returns the length of the line.
   *
   * @return The length of the line or `-1` if the end of the stream has been reached.
   */
  #readLine(): number {
    let appendedLineBegin = false;
    let code = 0;
    let isCommentLine = false;
    let isNewLine = true;
    let length = 0;
    let precedingBackslash = false;
    let skipLineFeed = false;
    let skipWhiteSpace = true;

    while (true) {
      if (this.#inputOffset >= this.#inputLimit) {
        this.#inputBuffer = this.#stream.read(8192) as Buffer;
        this.#inputLimit = this.#inputBuffer?.length ?? 0;
        this.#inputOffset = 0;

        if (this.#inputLimit <= 0) {
          if (length === 0 || isCommentLine) {
            return -1;
          }

          if (precedingBackslash) {
            length--;
          }

          return length;
        }
      }

      code = this.#inputBuffer[this.#inputOffset++]!;

      if (skipLineFeed) {
        skipLineFeed = false;

        if (code === asciiConstants.LF) {
          continue;
        }
      }

      if (skipWhiteSpace) {
        if (
          code === asciiConstants.SP ||
          code === asciiConstants.HT ||
          code === asciiConstants.FF
        ) {
          continue;
        }
        if (
          !appendedLineBegin &&
          (code === asciiConstants.CR || code === asciiConstants.LF)
        ) {
          continue;
        }

        appendedLineBegin = false;
        skipWhiteSpace = false;
      }

      if (isNewLine) {
        isNewLine = false;

        if (
          code === asciiConstants.NUMBER_SIGN ||
          code === asciiConstants.EXC
        ) {
          while (this.#inputOffset < this.#inputLimit) {
            code = this.#inputBuffer[this.#inputOffset++]!;

            if (
              code === asciiConstants.LF ||
              code === asciiConstants.CR ||
              code === asciiConstants.BACKSLASH
            ) {
              break;
            }
          }

          isCommentLine = true;
        }
      }

      if (code !== asciiConstants.LF && code !== asciiConstants.CR) {
        this.#lineBuffer[length++] = code;

        if (length === this.#lineBuffer.length) {
          const newLineBuffer = Buffer.alloc(
            Math.min(length * 2, bufferConstants.MAX_LENGTH),
          );
          this.#lineBuffer.copy(newLineBuffer);

          this.#lineBuffer = newLineBuffer;
        }

        if (code === asciiConstants.BACKSLASH) {
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

        if (this.#inputOffset >= this.#inputLimit) {
          this.#inputBuffer = this.#stream.read(8192) as Buffer;
          this.#inputLimit = this.#inputBuffer?.length ?? 0;
          this.#inputOffset = 0;

          if (this.#inputLimit <= 0) {
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

          if (code === asciiConstants.CR) {
            skipLineFeed = true;
          }
        } else {
          return length;
        }
      }
    }
  }

  /**
   * Reads the properties from the input stream and sets them into the specified `store`.
   *
   * @param store The {@link PropertiesStore} to which any read properties are to be set.
   */
  #readProperties(store: PropertiesStore): void {
    let limit: number | undefined;

    while ((limit = this.#readLine()) >= 0) {
      let code = 0;
      let hasSeparator = false;
      let keyLength = 0;
      let precedingBackslash = false;
      let valueStart = limit;

      while (keyLength < limit) {
        code = this.#lineBuffer[keyLength]!;

        if (
          (code === asciiConstants.EQUAL_SIGN ||
            code === asciiConstants.COLON) &&
          !precedingBackslash
        ) {
          hasSeparator = true;
          valueStart = keyLength + 1;
          break;
        } else if (
          (code === asciiConstants.SP ||
            code === asciiConstants.HT ||
            code === asciiConstants.FF) &&
          !precedingBackslash
        ) {
          valueStart = keyLength + 1;
          break;
        }

        if (code === asciiConstants.BACKSLASH) {
          precedingBackslash = !precedingBackslash;
        } else {
          precedingBackslash = false;
        }

        keyLength++;
      }

      while (valueStart < limit) {
        code = this.#lineBuffer[valueStart]!;

        if (
          code !== asciiConstants.SP &&
          code !== asciiConstants.HT &&
          code !== asciiConstants.FF
        ) {
          if (
            !hasSeparator &&
            (code === asciiConstants.EQUAL_SIGN ||
              code === asciiConstants.COLON)
          ) {
            hasSeparator = true;
          } else {
            break;
          }
        }

        valueStart++;
      }

      const key = this.#convert(
        this.#lineBuffer.toString(this.#encoding, 0, keyLength),
      );
      const value = this.#convert(
        this.#lineBuffer.toString(this.#encoding, valueStart, limit),
      );

      store.set(key, value);
    }
  }
}
