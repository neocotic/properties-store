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

import { EOL } from "node:os";
import {
  type Replacer,
  composeReplacer,
  escapeUnicode,
  isNotAscii,
  replaceChars,
  replaceCode,
} from "escape-unicode";
import { DateTime } from "luxon";
import { constants as asciiConstants } from "./ascii.js";
import type { PropertiesStore } from "./properties-store.js";

/**
 * The options that can be provided to {@link PropertiesWriter}.
 */
export interface PropertiesWriterOptions {
  /**
   * Any comments to be written to the output before the properties.
   */
  comments?: string;
  /**
   * Whether a timestamp should be written to the output.
   *
   * If enabled, the timestamp is written after any {@link #comments} but before the properties.
   */
  enableTimestamp: boolean;
  /**
   * Whether all non-ASCII characters are to be converted to Unicode escapes ("\uxxxx" notation).
   */
  enableUnicodeEscape: boolean;
  /**
   * The character encoding to be used to write the output.
   */
  encoding: NodeJS.BufferEncoding;
  /**
   * The output stream to be written to.
   */
  stream: NodeJS.WritableStream;
}

/**
 * The {@link Replacer} used when converting Unicode characters to their corresponding Unicode escapes ("\uxxxx"
 * notation) to also convert other common ASCII characters.
 */
const baseReplacer: Replacer = replaceChars({
  "\f": "\\f",
  "\n": "\\n",
  "\r": "\\r",
  "\t": "\\t",
  "\\": "\\\\",
});

/**
 * The regular expression used to match the separator between comment lines.
 */
const commentLineSeparator = /\r?\n/;

/**
 * A superset of {@link #baseReplacer} that also converts characters that are not allowed in property keys or values.
 */
const propertyReplacer: Replacer = composeReplacer(
  baseReplacer,
  replaceChars({
    "=": "\\=",
    ":": "\\:",
    "#": "\\#",
    "!": "\\!",
  }),
);

/**
 * A superset of {@link #propertyReplacer} that also converts characters the space character.
 */
const propertyReplacerIncludingSpace: Replacer = composeReplacer(
  propertyReplacer,
  replaceCode(asciiConstants.SP, "\\ "),
);

/**
 * Responsible for converting and writing properties from a {@link PropertiesStore} to an output stream.
 */
export class PropertiesWriter {
  /**
   * Any comments to be written to the output before the properties.
   */
  readonly #comments: string | undefined;
  /**
   * Whether a timestamp should be written to the output.
   */
  readonly #enableTimestamp: boolean;
  /**
   * Whether all non-ASCII characters are to be converted to Unicode escapes ("\uxxxx" notation).
   */
  readonly #enableUnicodeEscape: boolean;
  /**
   * The character encoding to be used to write the output.
   */
  readonly #encoding: NodeJS.BufferEncoding;
  /**
   * The output stream to be written to.
   */
  readonly #stream: NodeJS.WritableStream;

  /**
   * Creates an instance of {@link PropertiesWriter} using the `options` provided.
   *
   * @param options The options to be used.
   */
  constructor(options: PropertiesWriterOptions) {
    const { comments, enableTimestamp, enableUnicodeEscape, encoding, stream } =
      options;

    this.#comments = comments;
    this.#enableTimestamp = enableTimestamp;
    this.#enableUnicodeEscape = enableUnicodeEscape;
    this.#encoding = encoding;
    this.#stream = stream;
  }

  /**
   * Writes the properties from the properties `store` provided to the output stream after converting the key/value
   * pairs.
   *
   * @param store The {@link PropertiesStore} whose properties are to be written.
   */
  write(store: PropertiesStore): Promise<void> {
    return new Promise((resolve, reject) => {
      this.#stream.on("error", reject);
      this.#stream.on("finish", resolve);

      this.#writeProperties(store).catch(reject);
    });
  }

  /**
   * Converts any non-ASCII characters within the specified `output` string to their corresponding Unicode escapes
   * ("\uxxxx" notation), where applicable.
   *
   * @param output The output string to be converted.
   * @param isPropertyKey `true` if the `output` represents a property key; otherwise `false`.
   * @param isPropertyKey `true` if the `output` represents a property key; otherwise `false`.
   * @param isPropertyValue `true` if the `output` represents a property value; otherwise `false`
   * @return The converted string.
   */
  #convert(
    output: string,
    {
      isPropertyKey,
      isPropertyValue,
    }: { isPropertyKey?: boolean; isPropertyValue?: boolean } = {},
  ): string {
    const filter = this.#enableUnicodeEscape ? isNotAscii : () => false;

    if (
      isPropertyValue &&
      output.length > 0 &&
      output.charCodeAt(0) === asciiConstants.SP
    ) {
      return (
        escapeUnicode(output[0]!, {
          filter,
          replacer: propertyReplacerIncludingSpace,
        }) +
        escapeUnicode(output.slice(1), { filter, replacer: propertyReplacer })
      );
    }

    let replacer: Replacer;
    if (isPropertyKey) {
      replacer = propertyReplacerIncludingSpace;
    } else if (isPropertyValue) {
      replacer = propertyReplacer;
    } else {
      replacer = baseReplacer;
    }

    return escapeUnicode(output, { filter, replacer });
  }

  /**
   * Write the specified `output` to the output stream.
   *
   * @param output The output to be written.
   */
  #write(output: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.#stream.write(output, this.#encoding, (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Write comments to the output stream, if any.
   */
  async #writeComments(): Promise<void> {
    if (!this.#comments) {
      return;
    }

    const comments = this.#comments?.trim() ?? "";
    if (!comments) {
      return;
    }

    for (let line of comments.split(commentLineSeparator)) {
      line = line.trimEnd();
      if (line) {
        await this.#writeLine(`# ${this.#convert(line)}`);
      } else {
        await this.#writeLine("#");
      }
    }
  }

  /**
   * Write the specified `output` to the output stream followed by a newline character.
   *
   * @param output The output to be written.
   */
  async #writeLine(output: string): Promise<void> {
    await this.#write(`${output}${EOL}`);
  }

  /**
   * Write the properties from the specified `store` to the output stream.
   *
   * @param store The {@link PropertiesStore} whose properties are to be written.
   */
  async #writeProperties(store: PropertiesStore): Promise<void> {
    await this.#writeComments();
    await this.#writeTimestamp();

    for (let [key, value] of store) {
      key = this.#convert(key, { isPropertyKey: true });
      value = this.#convert(value, { isPropertyValue: true });

      await this.#writeLine(`${key}=${value}`);
    }

    this.#stream.end();
  }

  /**
   * Write a timestamp comment to the output stream, if enabled.
   */
  async #writeTimestamp(): Promise<void> {
    if (!this.#enableTimestamp) {
      return;
    }

    const timestamp = DateTime.local().toFormat(
      "ccc LLL dd HH:mm:ss ZZZZ yyyy",
    );

    await this.#writeLine(`# ${timestamp}`);
  }
}
