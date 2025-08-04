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
import { EOL } from "node:os";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { PropertiesStore } from "../src/properties-store.js";
import { PropertiesWriter } from "../src/properties-writer.js";
import { MockWritable } from "./mock-writable.js";

describe("PropertiesWriter", () => {
  let store: PropertiesStore;

  beforeEach(() => {
    store = new PropertiesStore();
  });

  describe("#write", () => {
    const expectedTimestampComment = "# Mon Oct 31 21:05:00 GMT 2016";

    beforeEach(() => {
      mock.timers.enable({ apis: ["Date"], now: 1477947900000 });
    });

    afterEach(() => {
      mock.timers.reset();
    });

    it("should write property key/value pairs on separate lines to output", async () => {
      const stream = new MockWritable();
      const expected = ["foo=bar", "fu=baz"].reduce(
        (memo, value) => `${memo}${value}${EOL}`,
        "",
      );

      store.set("foo", "bar");
      store.set("fu", "baz");

      const writer = new PropertiesWriter({
        enableTimestamp: false,
        enableUnicodeEscape: false,
        encoding: "latin1",
        stream,
      });

      await writer.write(store);

      assert.strictEqual(stream.buffer.toString("latin1"), expected);
    });

    it("should convert property key/value pairs before being written to output", async () => {
      const tests: Record<string, [string, string][]> = {
        "=": [["", ""]],
        "=bar": [["", "bar"]],
        "foo=": [["foo", ""]],
        "foo\\ bar=": [["foo bar", ""]],
        "foo=bar": [["foo", "bar"]],
        "foo1=bar2": [["foo1", "bar2"]],
        "1foo=2bar": [["1foo", "2bar"]],
        "\\ foo\\ =\\ bar ": [[" foo ", " bar "]],
        "f\\\\oo=ba\\\\r": [["f\\oo", "ba\\r"]],
        "foo\\f\\n\\r\\t=bar\\f\\n\\r\\t": [["foo\f\n\r\t", "bar\f\n\r\t"]],
        "foo\\=\\:\\#\\!=bar\\=\\:\\#\\!": [["foo=:#!", "bar=:#!"]],
      };

      for (const [expected, properties] of Object.entries(tests)) {
        const stream = new MockWritable();

        store.clear();

        for (const [key, value] of properties) {
          store.set(key, value);
        }

        const writer = new PropertiesWriter({
          enableTimestamp: false,
          enableUnicodeEscape: false,
          encoding: "latin1",
          stream,
        });

        await writer.write(store);

        assert.strictEqual(
          stream.buffer.toString("latin1"),
          `${expected}${EOL}`,
        );
      }
    });

    it("should write output using encoding option", async () => {
      const latin1Stream = new MockWritable();
      const utf8Stream = new MockWritable();
      const expected = `foo¥bar=fu¥baz${EOL}`;

      store.set("foo¥bar", "fu¥baz");

      const latin1Writer = new PropertiesWriter({
        enableTimestamp: false,
        enableUnicodeEscape: false,
        encoding: "latin1",
        stream: latin1Stream,
      });
      const utf8Writer = new PropertiesWriter({
        enableTimestamp: false,
        enableUnicodeEscape: false,
        encoding: "utf8",
        stream: utf8Stream,
      });

      await latin1Writer.write(store);
      await utf8Writer.write(store);

      assert.strictEqual(latin1Stream.buffer.toString("latin1"), expected);
      assert.strictEqual(utf8Stream.buffer.toString("utf8"), expected);
      assert.notDeepEqual(latin1Stream.buffer, utf8Stream.buffer);
    });

    describe("when no properties exist", () => {
      it("should not write to output", async () => {
        const stream = new MockWritable();
        const writer = new PropertiesWriter({
          enableTimestamp: false,
          enableUnicodeEscape: false,
          encoding: "latin1",
          stream,
        });

        await writer.write(store);

        assert.strictEqual(stream.buffer.length, 0);
      });
    });

    describe("when failed to write to output", () => {
      it("should throw an error", async () => {
        const expectedError = new Error("foo");
        const stream = new MockWritable({ error: expectedError });
        const expectedOutput = "";

        store.set("foo", "bar");
        store.set("fu", "baz");

        const writer = new PropertiesWriter({
          enableTimestamp: false,
          enableUnicodeEscape: false,
          encoding: "latin1",
          stream,
        });

        await assert.rejects(writer.write(store), expectedError);

        assert.strictEqual(stream.buffer.toString("latin1"), expectedOutput);
      });
    });

    describe("when comments option is not specified", () => {
      it("should only write property lines to output", async () => {
        const stream = new MockWritable();
        const expected = ["foo=bar", "fu=baz"].reduce(
          (memo, value) => `${memo}${value}${EOL}`,
          "",
        );

        store.set("foo", "bar");
        store.set("fu", "baz");

        const writer = new PropertiesWriter({
          enableTimestamp: false,
          enableUnicodeEscape: false,
          encoding: "latin1",
          stream,
        });

        await writer.write(store);

        assert.strictEqual(stream.buffer.toString("latin1"), expected);
      });
    });

    describe("when comments option is specified", () => {
      it("should write multi-line comments", async () => {
        const comments = "This\ris\r\na\n\nmulti-line\ncomment\n";
        const stream = new MockWritable();
        const expected = [
          "# This\\ris",
          "# a",
          "#",
          "# multi-line",
          "# comment",
          "foo=bar",
          "fu=baz",
        ].reduce((memo, value) => `${memo}${value}${EOL}`, "");

        store.set("foo", "bar");
        store.set("fu", "baz");

        const writer = new PropertiesWriter({
          comments,
          enableTimestamp: false,
          enableUnicodeEscape: false,
          encoding: "latin1",
          stream,
        });

        await writer.write(store);

        assert.strictEqual(stream.buffer.toString("latin1"), expected);
      });

      it("should write valid prefixes in comments", async () => {
        const comments = "This#is!a#comment";
        const stream = new MockWritable();
        const expected = [`# ${comments}`, "foo=bar", "fu=baz"].reduce(
          (memo, value) => `${memo}${value}${EOL}`,
          "",
        );

        store.set("foo", "bar");
        store.set("fu", "baz");

        const writer = new PropertiesWriter({
          comments,
          enableTimestamp: false,
          enableUnicodeEscape: false,
          encoding: "latin1",
          stream,
        });

        await writer.write(store);

        assert.strictEqual(stream.buffer.toString("latin1"), expected);
      });

      it("should write valid prefixes in multi-line comments", async () => {
        const comments = "This\ris\r\na\n\n#multi-line\n!comment\n";
        const stream = new MockWritable();
        const expected = [
          "# This\\ris",
          "# a",
          "#",
          "# #multi-line",
          "# !comment",
          "foo=bar",
          "fu=baz",
        ].reduce((memo, value) => `${memo}${value}${EOL}`, "");

        store.set("foo", "bar");
        store.set("fu", "baz");

        const writer = new PropertiesWriter({
          comments,
          enableTimestamp: false,
          enableUnicodeEscape: false,
          encoding: "latin1",
          stream,
        });

        await writer.write(store);

        assert.strictEqual(stream.buffer.toString("latin1"), expected);
      });

      describe("when comments option is an empty string", () => {
        it("should not write comment before property lines to output", async () => {
          const stream = new MockWritable();
          const expected = ["foo=bar", "fu=baz"].reduce(
            (memo, value) => `${memo}${value}${EOL}`,
            "",
          );

          store.set("foo", "bar");
          store.set("fu", "baz");

          const writer = new PropertiesWriter({
            comments: "",
            enableTimestamp: false,
            enableUnicodeEscape: false,
            encoding: "latin1",
            stream,
          });

          await writer.write(store);

          assert.strictEqual(stream.buffer.toString("latin1"), expected);
        });
      });

      describe("when no properties exist", () => {
        it("should only write comments to output", async () => {
          const comments = "This is a comment";
          const stream = new MockWritable();
          const expected = `# ${comments}${EOL}`;
          const writer = new PropertiesWriter({
            comments,
            enableTimestamp: false,
            enableUnicodeEscape: false,
            encoding: "latin1",
            stream,
          });

          await writer.write(store);

          assert.strictEqual(stream.buffer.toString("latin1"), expected);
        });
      });
    });

    describe("when enableTimestamp option is false and comments option is not specified", () => {
      describe("when properties exist", () => {
        it("should not write timestamp comment to output", async () => {
          const stream = new MockWritable();
          const expected = ["foo=bar", "fu=baz"].reduce(
            (memo, value) => `${memo}${value}${EOL}`,
            "",
          );

          store.set("foo", "bar");
          store.set("fu", "baz");

          const writer = new PropertiesWriter({
            enableTimestamp: false,
            enableUnicodeEscape: false,
            encoding: "latin1",
            stream,
          });

          await writer.write(store);

          assert.strictEqual(stream.buffer.toString("latin1"), expected);
        });
      });
    });

    describe("when enableTimestamp option is false and comments option is specified", () => {
      describe("when properties exist", () => {
        it("should write comments before property lines to output", async () => {
          const comments = "This is a comment";
          const stream = new MockWritable();
          const expected = [`# ${comments}`, "foo=bar", "fu=baz"].reduce(
            (memo, value) => `${memo}${value}${EOL}`,
            "",
          );

          store.set("foo", "bar");
          store.set("fu", "baz");

          const writer = new PropertiesWriter({
            comments,
            enableTimestamp: false,
            enableUnicodeEscape: false,
            encoding: "latin1",
            stream,
          });

          await writer.write(store);

          assert.strictEqual(stream.buffer.toString("latin1"), expected);
        });
      });

      describe("when no properties exist", () => {
        it("should write only comments to output", async () => {
          const comments = "This is a comment";
          const stream = new MockWritable();
          const expected = `# ${comments}${EOL}`;

          const writer = new PropertiesWriter({
            comments,
            enableTimestamp: false,
            enableUnicodeEscape: false,
            encoding: "latin1",
            stream,
          });

          await writer.write(store);

          assert.strictEqual(stream.buffer.toString("latin1"), expected);
        });
      });
    });

    describe("when enableTimestamp option is true and comments option is not specified", () => {
      describe("when properties exist", () => {
        it("should write timestamp comment to output before property lines", async () => {
          const stream = new MockWritable();
          const expected = [
            expectedTimestampComment,
            "foo=bar",
            "fu=baz",
          ].reduce((memo, value) => `${memo}${value}${EOL}`, "");

          store.set("foo", "bar");
          store.set("fu", "baz");

          const writer = new PropertiesWriter({
            enableTimestamp: true,
            enableUnicodeEscape: false,
            encoding: "latin1",
            stream,
          });

          await writer.write(store);

          assert.strictEqual(stream.buffer.toString("latin1"), expected);
        });
      });

      describe("when no properties exist", () => {
        it("should only write timestamp comment to output", async () => {
          const stream = new MockWritable();
          const writer = new PropertiesWriter({
            enableTimestamp: true,
            enableUnicodeEscape: false,
            encoding: "latin1",
            stream,
          });

          await writer.write(store);

          assert.strictEqual(
            stream.buffer.toString("latin1"),
            `${expectedTimestampComment}${EOL}`,
          );
        });
      });
    });

    describe("when enableTimestamp option is true and comments option is specified", () => {
      describe("when properties exist", () => {
        it("should write comments before timestamp comment and property lines to output", async () => {
          const comments = "This is a comment";
          const stream = new MockWritable();
          const expected = [
            `# ${comments}`,
            expectedTimestampComment,
            "foo=bar",
            "fu=baz",
          ].reduce((memo, value) => `${memo}${value}${EOL}`, "");

          store.set("foo", "bar");
          store.set("fu", "baz");

          const writer = new PropertiesWriter({
            comments,
            enableTimestamp: true,
            enableUnicodeEscape: false,
            encoding: "latin1",
            stream,
          });

          await writer.write(store);

          assert.strictEqual(stream.buffer.toString("latin1"), expected);
        });
      });

      describe("when no properties exist", () => {
        it("should write only comments before timestamp comment to output", async () => {
          const comments = "This is a comment";
          const stream = new MockWritable();
          const expected = [`# ${comments}`, expectedTimestampComment].reduce(
            (memo, value) => `${memo}${value}${EOL}`,
            "",
          );

          const writer = new PropertiesWriter({
            comments,
            enableTimestamp: true,
            enableUnicodeEscape: false,
            encoding: "latin1",
            stream,
          });

          await writer.write(store);

          assert.strictEqual(stream.buffer.toString("latin1"), expected);
        });
      });
    });

    describe("when enableUnicodeEscape option is false and comments option is not specified", () => {
      it("should write non-ASCII characters to output as-is", async () => {
        const stream = new MockWritable();
        const expected = [
          "foo¥bar=fu¥baz",
          "fizz=𠮷𠮾",
          "𠮷𠮾=buzz",
          "𠮷=𠮾",
        ].reduce((memo, value) => `${memo}${value}${EOL}`, "");

        store.set("foo¥bar", "fu¥baz");
        store.set("fizz", "𠮷𠮾");
        store.set("𠮷𠮾", "buzz");
        store.set("𠮷", "𠮾");

        const writer = new PropertiesWriter({
          enableTimestamp: false,
          enableUnicodeEscape: false,
          encoding: "utf8",
          stream,
        });

        await writer.write(store);

        assert.strictEqual(stream.buffer.toString("utf8"), expected);
      });
    });

    describe("when enableUnicodeEscape option is false and comments option is specified", () => {
      it("should write non-ASCII characters to output as-is", async () => {
        const comments = "This¥is¥a¥comment";
        const stream = new MockWritable();
        const expected = [
          `# ${comments}`,
          "foo¥bar=fu¥baz",
          "fizz=𠮷𠮾",
          "𠮷𠮾=buzz",
          "𠮷=𠮾",
        ].reduce((memo, value) => `${memo}${value}${EOL}`, "");

        store.set("foo¥bar", "fu¥baz");
        store.set("fizz", "𠮷𠮾");
        store.set("𠮷𠮾", "buzz");
        store.set("𠮷", "𠮾");

        const writer = new PropertiesWriter({
          comments,
          enableTimestamp: false,
          enableUnicodeEscape: false,
          encoding: "utf8",
          stream,
        });

        await writer.write(store);

        assert.strictEqual(stream.buffer.toString("utf8"), expected);
      });
    });

    describe("when enableUnicodeEscape option is true and comments option is not specified", () => {
      it("should escape non-ASCII characters before being written to output", async () => {
        const stream = new MockWritable();
        const expected = [
          "foo\\u00a5bar=fu\\u00a5baz",
          "fizz=\\ud842\\udfb7\\ud842\\udfbe",
          "\\ud842\\udfb7\\ud842\\udfbe=buzz",
          "\\ud842\\udfb7=\\ud842\\udfbe",
        ].reduce((memo, value) => `${memo}${value}${EOL}`, "");

        store.set("foo¥bar", "fu¥baz");
        store.set("fizz", "𠮷𠮾");
        store.set("𠮷𠮾", "buzz");
        store.set("𠮷", "𠮾");

        const writer = new PropertiesWriter({
          enableTimestamp: false,
          enableUnicodeEscape: true,
          encoding: "latin1",
          stream,
        });

        await writer.write(store);

        assert.strictEqual(stream.buffer.toString("latin1"), expected);
      });
    });

    describe("when enableUnicodeEscape option is true and comments option is specified", () => {
      it("should escape non-ASCII characters before being written to output", async () => {
        const comments = "This¥is¥a¥comment";
        const stream = new MockWritable();
        const expected = [
          "# This\\u00a5is\\u00a5a\\u00a5comment",
          "foo\\u00a5bar=fu\\u00a5baz",
          "fizz=\\ud842\\udfb7\\ud842\\udfbe",
          "\\ud842\\udfb7\\ud842\\udfbe=buzz",
          "\\ud842\\udfb7=\\ud842\\udfbe",
        ].reduce((memo, value) => `${memo}${value}${EOL}`, "");

        store.set("foo¥bar", "fu¥baz");
        store.set("fizz", "𠮷𠮾");
        store.set("𠮷𠮾", "buzz");
        store.set("𠮷", "𠮾");

        const writer = new PropertiesWriter({
          comments,
          enableTimestamp: false,
          enableUnicodeEscape: true,
          encoding: "latin1",
          stream,
        });

        await writer.write(store);

        assert.strictEqual(stream.buffer.toString("latin1"), expected);
      });
    });
  });
});
