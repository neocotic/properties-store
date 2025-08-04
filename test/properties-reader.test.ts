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

import * as assert from "node:assert";
import { Readable } from "node:stream";
import { beforeEach, describe, it, mock } from "node:test";
import { ReadStream } from "node:tty";
import { PropertiesReader } from "../src/properties-reader.js";
import { PropertiesStore } from "../src/properties-store.js";

describe("PropertiesReader", () => {
  let store: PropertiesStore;

  beforeEach(() => {
    store = new PropertiesStore();
  });

  describe("#read", () => {
    it("should read all property information from input", async () => {
      const stream = Readable.from(
        Buffer.from(
          ["", "# foo", "! foo", "foo=bar", "fu:baz", "fizz buzz"].join("\r\n"),
          "latin1",
        ),
      );
      const expected = [
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ];
      const reader = new PropertiesReader({ encoding: "latin1", stream });

      await reader.read(store);

      assert.deepStrictEqual(Array.from(store), expected);
    });

    it("should read multi-line property values from input", async () => {
      const stream = Readable.from(
        Buffer.from(
          [
            "foo=b\\\r\\a\\\nr",
            " fu : b \\\r\n\\ a \\\n z ",
            "fizz buzz\\",
          ].join("\r\n"),
          "latin1",
        ),
      );
      const expected = [
        ["foo", "bar"],
        ["fu", "b  a z "],
        ["fizz", "buzz"],
      ];
      const reader = new PropertiesReader({ encoding: "latin1", stream });

      await reader.read(store);

      assert.deepStrictEqual(Array.from(store), expected);
    });

    it("should convert property information once read from input", async () => {
      const tests = {
        "=": [["", ""]],
        "=bar": [["", "bar"]],
        foo: [["foo", ""]],
        "foo=": [["foo", ""]],
        "foo bar": [["foo", "bar"]],
        "foo=bar": [["foo", "bar"]],
        "foo1=bar2": [["foo1", "bar2"]],
        "1foo=2bar": [["1foo", "2bar"]],
        "\\ foo\\ =\\ bar ": [[" foo ", " bar "]],
        "f\\\\oo=ba\\\\r": [["f\\oo", "ba\\r"]],
        "foo\\f\\n\\r\\t=bar\\f\\n\\r\\t": [["foo\f\n\r\t", "bar\f\n\r\t"]],
        "foo\\=\\:\\#\\!=bar\\=\\:\\#\\!": [["foo=:#!", "bar=:#!"]],
        "foo\f\n\r\t=bar\f\n\r\t": [
          ["foo", ""],
          ["", "bar\f"],
        ],
        "foo=:#!=bar=\\:\\#\\!": [["foo", ":#!=bar=:#!"]],
        "foo\\u00a5bar=fu\\u00a5baz": [["foo¥bar", "fu¥baz"]],
        "foo=\\ud842\\udfb7\\ud842\\udfbe": [["foo", "𠮷𠮾"]],
        "\\ud842\\udfb7\\ud842\\udfbe=bar": [["𠮷𠮾", "bar"]],
        "\\ud842\\udfb7=\\ud842\\udfbe": [["𠮷", "𠮾"]],
      };

      for (const [inputString, expected] of Object.entries(tests)) {
        const stream = Readable.from(Buffer.from(inputString, "latin1"));

        store.clear();

        const reader = new PropertiesReader({ encoding: "latin1", stream });

        await reader.read(store);

        assert.deepStrictEqual(Array.from(store), expected);
      }
    });

    it("should be able to read large lines", async () => {
      const key = "a";
      const value = "b".repeat(8192 - (key.length + 2));
      const stream = Readable.from(Buffer.from(`${key}=${value}\n`, "latin1"));
      const expected = [[key, value]];
      const reader = new PropertiesReader({ encoding: "latin1", stream });

      await reader.read(store);

      assert.deepStrictEqual(Array.from(store), expected);
    });

    it("should be able to read large multi-lines", async () => {
      const key = "a";
      const value = "b".repeat(8192 - (key.length + 3));
      const stream = Readable.from(
        Buffer.from(`${key}=${value}\\\nfoo`, "latin1"),
      );
      const expected = [[key, `${value}foo`]];
      const reader = new PropertiesReader({ encoding: "latin1", stream });

      await reader.read(store);

      assert.deepStrictEqual(Array.from(store), expected);
    });

    it("should be able to read large multi-lines ending with a backslash", async () => {
      const key = "a";
      const value = "b".repeat(8192 - (key.length + 3));
      const stream = Readable.from(
        Buffer.from(`${key}=${value}\\\n`, "latin1"),
      );
      const expected = [[key, value]];
      const reader = new PropertiesReader({ encoding: "latin1", stream });

      await reader.read(store);

      assert.deepStrictEqual(Array.from(store), expected);
    });

    it("should be able to read very large lines", async () => {
      const key = "a".repeat(8192);
      const value = "b".repeat(8192);
      const stream = Readable.from(Buffer.from(`${key}=${value}`, "latin1"));
      const expected = [[key, value]];
      const reader = new PropertiesReader({ encoding: "latin1", stream });

      await reader.read(store);

      assert.deepStrictEqual(Array.from(store), expected);
    });

    it("should read input using encoding option", async () => {
      const encodings: NodeJS.BufferEncoding[] = ["latin1", "utf8"];

      for (const encoding of encodings) {
        const stream = Readable.from(Buffer.from("foo¥bar=fu¥baz", encoding));
        const expected = [["foo¥bar", "fu¥baz"]];
        const reader = new PropertiesReader({ encoding, stream });

        await reader.read(store);

        assert.deepStrictEqual(Array.from(store), expected);
      }
    });

    describe("when input contains no property lines", () => {
      it("should read no properties", async () => {
        const stream = Readable.from(
          Buffer.from(["", "# foo"].join("\n"), "latin1"),
        );
        const expected: string[][] = [];
        const reader = new PropertiesReader({ encoding: "latin1", stream });

        await reader.read(store);

        assert.deepStrictEqual(Array.from(store), expected);
      });
    });

    describe("when input is empty", () => {
      it("should read no properties", async () => {
        const stream = Readable.from(Buffer.from("", "latin1"));
        const reader = new PropertiesReader({ encoding: "latin1", stream });

        await reader.read(store);

        assert.strictEqual(store.size, 0);
      });
    });

    describe("when input is TTY", () => {
      let stream: ReadStream;

      beforeEach(async () => {
        stream = new ReadStream(0);

        return new Promise<void>((resolve, reject) => {
          stream.write(Buffer.from("foo=bar", "latin1"), (err) => {
            if (err) {
              reject(err);
            } else {
              resolve();
            }
          });
        });
      });

      it("should read no properties", async () => {
        const reader = new PropertiesReader({ encoding: "latin1", stream });

        await reader.read(store);

        assert.strictEqual(store.size, 0);
      });
    });

    describe("when failed to read from input", () => {
      it("should throw an error", async () => {
        const stream = Readable.from(Buffer.from("foo=bar", "latin1"));
        mock.method(
          stream,
          "read",
          () => {
            stream.emit("error", new Error("bad"));
            return null;
          },
          { times: 1 },
        );

        const reader = new PropertiesReader({ encoding: "latin1", stream });

        await assert.rejects(reader.read(store), new Error("bad"));

        assert.strictEqual(store.size, 0);
      });
    });
  });
});
