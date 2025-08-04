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
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, it, mock } from "node:test";
import { ReadStream } from "node:tty";
import {
  PropertiesStore,
  type PropertiesStoreReplaceCallback,
} from "../src/properties-store.js";
import { MockWritable } from "./mock-writable.js";

describe("PropertiesStore", () => {
  describe(".load", () => {
    it("should create PropertiesStore loaded with properties read from input", async () => {
      const input = Readable.from(
        Buffer.from(["", "# foo", "foo=bar"].join("\n")),
      );
      const expected = [["foo", "bar"]];

      const store = await PropertiesStore.load(input);

      assert.deepEqual(Array.from(store), expected);
    });

    describe("when encoding option is not specified", () => {
      it("should read input using latin1 encoding", async () => {
        const input = Readable.from(Buffer.from("foo¥bar=fu¥baz"));
        const expected = [
          [
            Buffer.from("foo¥bar").toString("latin1"),
            Buffer.from("fu¥baz").toString("latin1"),
          ],
        ];

        const store = await PropertiesStore.load(input);

        assert.deepStrictEqual(Array.from(store), expected);
      });
    });

    describe("when encoding option is specified", () => {
      it("should read input using encoding", async () => {
        const input = Readable.from(Buffer.from("foo¥bar=fu¥baz"));
        const expected = [["foo¥bar", "fu¥baz"]];

        const store = await PropertiesStore.load(input, { encoding: "utf8" });

        assert.deepStrictEqual(Array.from(store), expected);
      });
    });
  });

  describe("constructor", () => {
    describe("when iterable is specified as a 2D string array", () => {
      it("should contain properties from array initially", () => {
        const properties: [string, string][] = [
          ["foo", "bar"],
          ["fu", "baz"],
        ];
        const store = new PropertiesStore(properties);

        assert.deepStrictEqual(Array.from(store), properties);
      });

      it("should not reflect any changes to array afterwards", () => {
        const properties: [string, string][] = [
          ["foo", "bar"],
          ["fu", "baz"],
        ];
        const store = new PropertiesStore(properties);

        properties.push(["fizz", "buzz"]);

        assert.deepStrictEqual(Array.from(store), [
          ["foo", "bar"],
          ["fu", "baz"],
        ]);
      });
    });

    describe("when iterable is specified as PropertiesStore", () => {
      it("should contain properties from store initially", () => {
        const properties: [string, string][] = [
          ["foo", "bar"],
          ["fu", "baz"],
        ];
        const other = new PropertiesStore(properties);
        const store = new PropertiesStore(other);

        assert.deepStrictEqual(Array.from(store), properties);
      });

      it("should not reflect any changes to store afterwards", () => {
        const properties: [string, string][] = [
          ["foo", "bar"],
          ["fu", "baz"],
        ];
        const other = new PropertiesStore(properties);
        const store = new PropertiesStore(other);

        other.clear();

        assert.deepStrictEqual(Array.from(store), properties);
      });
    });

    describe("when iterable is omitted", () => {
      it("should contain no properties initially", () => {
        const expected: [string, string][] = [];
        const store = new PropertiesStore();

        assert.deepStrictEqual(Array.from(store), expected);
      });
    });
  });

  describe("#clear", () => {
    it("should remove all properties", () => {
      const store = new PropertiesStore([
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ]);

      store.clear();

      assert.strictEqual(store.size, 0);
    });

    it('should emit single "clear" event and a "delete" event for each removed property', () => {
      const clearCallback = mock.fn();
      const deleteCallback = mock.fn();
      const store = new PropertiesStore([
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ]);

      store.on("clear", clearCallback);
      store.on("delete", deleteCallback);

      store.clear();

      assert.strictEqual(clearCallback.mock.callCount(), 1);
      assert.strictEqual(deleteCallback.mock.callCount(), 3);

      assert.deepStrictEqual(clearCallback.mock.calls[0]?.arguments, [
        { properties: store },
      ]);

      assert.deepStrictEqual(deleteCallback.mock.calls[0]?.arguments, [
        {
          key: "foo",
          properties: store,
          value: "bar",
        },
      ]);
      assert.deepStrictEqual(deleteCallback.mock.calls[1]?.arguments, [
        {
          key: "fu",
          properties: store,
          value: "baz",
        },
      ]);
      assert.deepStrictEqual(deleteCallback.mock.calls[2]?.arguments, [
        {
          key: "fizz",
          properties: store,
          value: "buzz",
        },
      ]);
    });

    describe("when no properties exist", () => {
      it('should emit "clear" event but not "delete" event', () => {
        const clearCallback = mock.fn();
        const deleteCallback = mock.fn();
        const store = new PropertiesStore();

        store.on("clear", clearCallback);
        store.on("delete", deleteCallback);

        store.clear();

        assert.strictEqual(clearCallback.mock.callCount(), 1);
        assert.strictEqual(deleteCallback.mock.callCount(), 0);

        assert.deepStrictEqual(clearCallback.mock.calls[0]?.arguments, [
          { properties: store },
        ]);
      });
    });
  });

  describe("#delete", () => {
    it("should remove property for key and return true", () => {
      const properties: [string, string][] = [
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ];
      const store = new PropertiesStore(properties);
      const expected = properties.slice(1);

      assert.strictEqual(store.delete("foo"), true);

      assert.deepStrictEqual(Array.from(store), expected);
    });

    it('should emit "delete" event', () => {
      const deleteCallback = mock.fn();
      const store = new PropertiesStore([
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ]);

      store.on("delete", deleteCallback);

      assert.strictEqual(store.delete("foo"), true);

      assert.strictEqual(deleteCallback.mock.callCount(), 1);

      assert.deepStrictEqual(deleteCallback.mock.calls[0]?.arguments, [
        {
          key: "foo",
          properties: store,
          value: "bar",
        },
      ]);
    });

    describe("when no property exists for key", () => {
      it("should not remove any property and return false", () => {
        const properties: [string, string][] = [
          ["foo", "bar"],
          ["fu", "baz"],
        ];
        const store = new PropertiesStore(properties);

        assert.strictEqual(store.delete("fizz"), false);

        assert.deepStrictEqual(Array.from(store), properties);
      });

      it('should not emit "delete" event', () => {
        const deleteCallback = mock.fn();
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
        ]);

        store.on("delete", deleteCallback);

        assert.strictEqual(store.delete("fizz"), false);

        assert.strictEqual(deleteCallback.mock.callCount(), 0);
      });
    });

    describe("when key is using different case", () => {
      it("should not remove any property and return false", () => {
        const properties: [string, string][] = [
          ["foo", "bar"],
          ["FU", "baz"],
        ];
        const store = new PropertiesStore(properties);

        assert.strictEqual(store.delete("FOO"), false);
        assert.strictEqual(store.delete("fu"), false);

        assert.deepStrictEqual(Array.from(store), properties);
      });

      it('should not emit "delete" event', () => {
        const deleteCallback = mock.fn();
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["FU", "baz"],
        ]);

        store.on("delete", deleteCallback);

        assert.strictEqual(store.delete("FOO"), false);
        assert.strictEqual(store.delete("fu"), false);

        assert.strictEqual(deleteCallback.mock.callCount(), 0);
      });
    });

    describe("when key is a regular expression", () => {
      it("should only remove properties that match key", () => {
        const properties: [string, string][] = [
          ["foo", "bar"],
          ["fu", "baz"],
          ["fizz", "buzz"],
        ];
        const expected = properties.slice(2);
        const store = new PropertiesStore(properties);

        assert.strictEqual(store.delete(/^f(oo|u)$/), true);

        assert.deepStrictEqual(Array.from(store), expected);
      });

      it('should emit "delete" event for each property that matches key', () => {
        const deleteCallback = mock.fn();
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
          ["fizz", "buzz"],
        ]);

        store.on("delete", deleteCallback);

        assert.strictEqual(store.delete(/^f(oo|u)$/), true);

        assert.strictEqual(deleteCallback.mock.callCount(), 2);

        assert.deepStrictEqual(deleteCallback.mock.calls[0]?.arguments, [
          {
            key: "foo",
            properties: store,
            value: "bar",
          },
        ]);
        assert.deepStrictEqual(deleteCallback.mock.calls[1]?.arguments, [
          {
            key: "fu",
            properties: store,
            value: "baz",
          },
        ]);
      });

      describe("when no properties match key", () => {
        it("should not remove any properties and return false", () => {
          const properties: [string, string][] = [
            ["foo", "bar"],
            ["fu", "baz"],
          ];
          const store = new PropertiesStore(properties);

          assert.strictEqual(store.delete(/fiz{2}/), false);

          assert.deepStrictEqual(Array.from(store), properties);
        });

        it('should not emit any "delete" events', () => {
          const deleteCallback = mock.fn();
          const store = new PropertiesStore([
            ["foo", "bar"],
            ["fu", "baz"],
          ]);

          store.on("delete", deleteCallback);

          assert.strictEqual(store.delete(/fiz{2}/), false);

          assert.strictEqual(deleteCallback.mock.callCount(), 0);
        });
      });
    });
  });

  describe("#entries", () => {
    it("should return iterator for each property key/value pair", () => {
      const properties: [string, string][] = [
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ];
      const store = new PropertiesStore(properties);

      const iterator = store.entries();

      assert.deepStrictEqual(iterator.next().value, ["foo", "bar"]);
      assert.deepStrictEqual(iterator.next().value, ["fu", "baz"]);
      assert.deepStrictEqual(iterator.next().value, ["fizz", "buzz"]);
      assert.strictEqual(iterator.next().value, undefined);

      assert.deepStrictEqual(Array.from(store.entries()), properties);
    });

    describe("when no properties exist", () => {
      it("should return an empty iterator", () => {
        const store = new PropertiesStore();
        const iterator = store.entries();

        assert.strictEqual(iterator.next().value, undefined);

        assert.deepStrictEqual(Array.from(store.entries()), []);
      });
    });
  });

  describe("#forEach", () => {
    it("should invoke callback with each property key/value pair", () => {
      const callback = mock.fn();
      const store = new PropertiesStore([
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ]);

      store.forEach(callback);

      assert.strictEqual(callback.mock.callCount(), 3);

      assert.deepStrictEqual(callback.mock.calls[0]?.arguments, [
        "bar",
        "foo",
        store,
      ]);
      assert.strictEqual(callback.mock.calls[0]?.this, undefined);

      assert.deepStrictEqual(callback.mock.calls[1]?.arguments, [
        "baz",
        "fu",
        store,
      ]);
      assert.strictEqual(callback.mock.calls[1]?.this, undefined);

      assert.deepStrictEqual(callback.mock.calls[2]?.arguments, [
        "buzz",
        "fizz",
        store,
      ]);
      assert.strictEqual(callback.mock.calls[2]?.this, undefined);
    });

    describe("when no properties exist", () => {
      it("should not invoke callback", () => {
        const callback = mock.fn();
        const store = new PropertiesStore();

        store.forEach(callback);

        assert.strictEqual(callback.mock.callCount(), 0);
      });
    });

    describe("when thisArg is specified", () => {
      it('should invoke callback using thisArg as "this"', () => {
        const callback = mock.fn();
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
          ["fizz", "buzz"],
        ]);
        const thisArg = {};

        store.forEach(callback, thisArg);

        assert.strictEqual(callback.mock.callCount(), 3);

        assert.deepStrictEqual(callback.mock.calls[0]?.arguments, [
          "bar",
          "foo",
          store,
        ]);
        assert.strictEqual(callback.mock.calls[0]?.this, thisArg);

        assert.deepStrictEqual(callback.mock.calls[1]?.arguments, [
          "baz",
          "fu",
          store,
        ]);
        assert.strictEqual(callback.mock.calls[1]?.this, thisArg);

        assert.deepStrictEqual(callback.mock.calls[2]?.arguments, [
          "buzz",
          "fizz",
          store,
        ]);
        assert.strictEqual(callback.mock.calls[2]?.this, thisArg);
      });
    });
  });

  describe("#get", () => {
    describe("when property exists for key", () => {
      it("should return value of property for key", () => {
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
          ["fizz", "buzz"],
        ]);

        assert.strictEqual(store.get("foo"), "bar");
        assert.strictEqual(store.get("fu"), "baz");
        assert.strictEqual(store.get("fizz"), "buzz");
      });
    });

    describe("when no property exists for key", () => {
      describe("when defaultValue is specified", () => {
        it("should return defaultValue", () => {
          const store = new PropertiesStore([
            ["foo", "bar"],
            ["fu", "baz"],
          ]);

          assert.strictEqual(store.get("fizz", "123"), "123");
          assert.strictEqual(store.get("fizz", ""), "");
        });
      });

      describe("when defaultValue is omitted", () => {
        it("should return undefined", () => {
          const store = new PropertiesStore([
            ["foo", "bar"],
            ["fu", "baz"],
          ]);

          assert.strictEqual(store.get("fizz"), undefined);
        });
      });
    });

    describe("when key is using different case", () => {
      describe("when defaultValue is specified", () => {
        it("should return defaultValue", () => {
          const store = new PropertiesStore([
            ["foo", "bar"],
            ["FU", "baz"],
          ]);

          assert.strictEqual(store.get("FOO", "123"), "123");
          assert.strictEqual(store.get("FOO", ""), "");
        });
      });

      describe("when defaultValue is omitted", () => {
        it("should return undefined", () => {
          const store = new PropertiesStore([
            ["foo", "bar"],
            ["FU", "baz"],
          ]);

          assert.strictEqual(store.get("FOO"), undefined);
          assert.strictEqual(store.get("fu"), undefined);
        });
      });
    });
  });

  describe("#has", () => {
    describe("when a property exists for key", () => {
      it("should return true", () => {
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
          ["fizz", "buzz"],
        ]);

        assert.strictEqual(store.has("foo"), true);
      });
    });

    describe("when no property exist for key", () => {
      it("should return false", () => {
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
        ]);

        assert.strictEqual(store.has("fizz"), false);
      });
    });

    describe("when key is using different case", () => {
      it("should return false", () => {
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["FU", "baz"],
        ]);

        assert.strictEqual(store.has("FOO"), false);
        assert.strictEqual(store.has("fu"), false);
      });
    });

    describe("when key is a regular expression", () => {
      describe("when a single property matches key", () => {
        it("should return true", () => {
          const store = new PropertiesStore([
            ["foo", "bar"],
            ["fu", "baz"],
            ["fizz", "buzz"],
          ]);

          assert.strictEqual(store.has(/foo/), true);
        });
      });

      describe("when multiple properties match key", () => {
        it("should return true", () => {
          const store = new PropertiesStore([
            ["foo", "bar"],
            ["fu", "baz"],
            ["fizz", "buzz"],
          ]);

          assert.strictEqual(store.has(/^f/), true);
        });
      });

      describe("when no properties match key", () => {
        it("should return false", () => {
          const store = new PropertiesStore([
            ["foo", "bar"],
            ["fu", "baz"],
            ["fizz", "buzz"],
          ]);

          assert.strictEqual(store.has(/^ba/), false);
        });
      });
    });
  });

  describe("#keys", () => {
    it("should return iterator for each property key", () => {
      const properties: [string, string][] = [
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ];
      const store = new PropertiesStore(properties);
      const expected = properties.map(([key]) => key);

      const iterator = store.keys();

      assert.strictEqual(iterator.next().value, "foo");
      assert.strictEqual(iterator.next().value, "fu");
      assert.strictEqual(iterator.next().value, "fizz");
      assert.strictEqual(iterator.next().value, undefined);

      assert.deepStrictEqual(Array.from(store.keys()), expected);
    });

    describe("when no properties exist", () => {
      it("should return an empty iterator", () => {
        const store = new PropertiesStore();
        const iterator = store.keys();

        assert.strictEqual(iterator.next().value, undefined);

        assert.deepStrictEqual(Array.from(store.keys()), []);
      });
    });
  });

  describe("#load", () => {
    it("should read properties from input", async () => {
      const input = Readable.from(
        Buffer.from(["", "# foo", "foo=bar"].join("\n")),
      );
      const expected = [["foo", "bar"]];
      const store = new PropertiesStore();

      await store.load(input);

      assert.deepStrictEqual(Array.from(store), expected);
    });

    it('should emit "load" event and a "change" event for each changed property', async () => {
      const changeCallback = mock.fn();
      const loadCallback = mock.fn();
      const input = Readable.from(
        Buffer.from(
          [
            "",
            "# foo",
            "foo=bar",
            "",
            "foo=baz",
            "foo=buzz",
            "",
            "fu=bar",
          ].join("\n"),
        ),
      );
      const store = new PropertiesStore();

      store.on("change", changeCallback);
      store.on("load", loadCallback);

      await store.load(input);

      assert.strictEqual(changeCallback.mock.callCount(), 4);
      assert.strictEqual(loadCallback.mock.callCount(), 1);

      assert.deepStrictEqual(changeCallback.mock.calls[0]?.arguments, [
        {
          key: "foo",
          newValue: "bar",
          oldValue: undefined,
          properties: store,
        },
      ]);
      assert.deepStrictEqual(changeCallback.mock.calls[1]?.arguments, [
        {
          key: "foo",
          newValue: "baz",
          oldValue: "bar",
          properties: store,
        },
      ]);
      assert.deepStrictEqual(changeCallback.mock.calls[2]?.arguments, [
        {
          key: "foo",
          newValue: "buzz",
          oldValue: "baz",
          properties: store,
        },
      ]);
      assert.deepStrictEqual(changeCallback.mock.calls[3]?.arguments, [
        {
          key: "fu",
          newValue: "bar",
          oldValue: undefined,
          properties: store,
        },
      ]);

      assert.deepStrictEqual(loadCallback.mock.calls[0]?.arguments, [
        {
          input,
          options: { encoding: "latin1" },
          properties: store,
        },
      ]);
    });

    it("should extend existing properties", async () => {
      const input = Readable.from(
        Buffer.from(["", "# foo", "foo=buzz", "", "fu=baz"].join("\n")),
      );
      const expected = [
        ["foo", "buzz"],
        ["fu", "baz"],
      ];
      const store = new PropertiesStore([["foo", "bar"]]);

      await store.load(input);

      assert.deepStrictEqual(Array.from(store), expected);
    });

    describe("when input contains no property lines", () => {
      it("should read no properties", async () => {
        const input = Readable.from(Buffer.from(["", "# foo"].join("\n")));
        const store = new PropertiesStore();

        await store.load(input);

        assert.strictEqual(store.size, 0);
      });

      it('should emit "load" event but not any "change" events', async () => {
        const changeCallback = mock.fn();
        const loadCallback = mock.fn();
        const input = Readable.from(Buffer.from(["", "# foo"].join("\n")));
        const store = new PropertiesStore();

        store.on("change", changeCallback);
        store.on("load", loadCallback);

        await store.load(input);

        assert.strictEqual(changeCallback.mock.callCount(), 0);
        assert.strictEqual(loadCallback.mock.callCount(), 1);

        assert.deepStrictEqual(loadCallback.mock.calls[0]?.arguments, [
          {
            input,
            options: { encoding: "latin1" },
            properties: store,
          },
        ]);
      });
    });

    describe("when input is empty", () => {
      it("should read no properties", async () => {
        const input = Readable.from(Buffer.alloc(0));
        const store = new PropertiesStore();

        await store.load(input);

        assert.strictEqual(store.size, 0);
      });
    });

    describe("when input is TTY", () => {
      let input: ReadStream;

      beforeEach(async () => {
        input = new ReadStream(0);

        return new Promise<void>((resolve, reject) => {
          input.write(
            Buffer.from(["", "# foo", "foo=bar"].join("\n")),
            (err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            },
          );
        });
      });

      it("should read no properties", async () => {
        const store = new PropertiesStore();

        await store.load(input);

        assert.strictEqual(store.size, 0);
      });
    });

    describe("when failed to read from input", () => {
      it("should throw an error", async () => {
        const input = Readable.from(Buffer.from("foo=bar", "latin1"));
        mock.method(
          input,
          "read",
          () => {
            input.emit("error", new Error("bad"));
            return null;
          },
          { times: 1 },
        );
        const store = new PropertiesStore();

        await assert.rejects(store.load(input), new Error("bad"));

        assert.strictEqual(store.size, 0);
      });
    });

    describe("when encoding option is not specified", () => {
      it("should read input using latin1 encoding", async () => {
        const input = Readable.from(Buffer.from("foo¥bar=fu¥baz"));
        const expected = [
          [
            Buffer.from("foo¥bar").toString("latin1"),
            Buffer.from("fu¥baz").toString("latin1"),
          ],
        ];
        const store = new PropertiesStore();

        await store.load(input);

        assert.deepStrictEqual(Array.from(store), expected);
      });
    });

    describe("when encoding option is specified", () => {
      it("should read input using encoding", async () => {
        const input = Readable.from(Buffer.from("foo¥bar=fu¥baz"));
        const expected = [["foo¥bar", "fu¥baz"]];
        const store = new PropertiesStore();

        await store.load(input, { encoding: "utf8" });

        assert.deepStrictEqual(Array.from(store), expected);
      });
    });
  });

  describe("#replace", () => {
    describe("when no properties match regexp", () => {
      it("should not change or remove any properties and return PropertiesStore", () => {
        const callback = mock.fn<PropertiesStoreReplaceCallback>();
        const properties: [string, string][] = [
          ["foo", "bar"],
          ["fu", "baz"],
        ];
        const store = new PropertiesStore(properties);

        assert.strictEqual(store.replace(/fizz/, callback), store);

        assert.deepStrictEqual(Array.from(store), properties);

        assert.strictEqual(callback.mock.callCount(), 0);
      });

      it('should not emit any "change" events', () => {
        const changeCallback = mock.fn();
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
        ]);

        store.on("change", changeCallback);

        assert.strictEqual(
          store.replace(/fizz/, () => "buzz"),
          store,
        );

        assert.strictEqual(changeCallback.mock.callCount(), 0);
      });
    });

    describe("when properties match regexp", () => {
      it("should set matching property value returned by invoking callback and return PropertiesStore", () => {
        const callback = mock.fn((value) => value.split("").reverse().join(""));
        const expected = [
          ["foo", "rab"],
          ["fu", "zab"],
          ["fizz", "buzz"],
        ];
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
          ["fizz", "buzz"],
        ]);

        assert.strictEqual(store.replace(/^f(oo|u)$/, callback), store);

        assert.deepStrictEqual(Array.from(store), expected);

        assert.strictEqual(callback.mock.callCount(), 2);

        assert.deepStrictEqual(callback.mock.calls[0]?.arguments, [
          "bar",
          "foo",
          store,
        ]);
        assert.strictEqual(callback.mock.calls[0]?.this, undefined);

        assert.deepStrictEqual(callback.mock.calls[1]?.arguments, [
          "baz",
          "fu",
          store,
        ]);
        assert.strictEqual(callback.mock.calls[1]?.this, undefined);
      });

      it('should emit "change" event for each matching property', () => {
        const callback = mock.fn((value) => value.split("").reverse().join(""));
        const changeCallback = mock.fn();
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
          ["fizz", "buzz"],
        ]);

        store.on("change", changeCallback);

        assert.strictEqual(store.replace(/^f(oo|u)$/, callback), store);

        assert.strictEqual(changeCallback.mock.callCount(), 2);

        assert.deepStrictEqual(changeCallback.mock.calls[0]?.arguments, [
          {
            key: "foo",
            newValue: "rab",
            oldValue: "bar",
            properties: store,
          },
        ]);
        assert.deepStrictEqual(changeCallback.mock.calls[1]?.arguments, [
          {
            key: "fu",
            newValue: "zab",
            oldValue: "baz",
            properties: store,
          },
        ]);
      });

      describe("when value returned by callback is same as existing", () => {
        it("should not change or remove matching property and return PropertiesStore", () => {
          const callback = mock.fn((value) => value);
          const properties: [string, string][] = [
            ["foo", "bar"],
            ["fu", "baz"],
            ["fizz", "buzz"],
          ];
          const store = new PropertiesStore(properties);

          assert.strictEqual(store.replace(/^f(oo|u)$/, callback), store);

          assert.deepStrictEqual(Array.from(store), properties);

          assert.strictEqual(callback.mock.callCount(), 2);

          assert.deepStrictEqual(callback.mock.calls[0]?.arguments, [
            "bar",
            "foo",
            store,
          ]);
          assert.strictEqual(callback.mock.calls[0]?.this, undefined);

          assert.deepStrictEqual(callback.mock.calls[1]?.arguments, [
            "baz",
            "fu",
            store,
          ]);
          assert.strictEqual(callback.mock.calls[1]?.this, undefined);
        });

        it('should not emit "change" event', () => {
          const callback = mock.fn((value) => value);
          const changeCallback = mock.fn();
          const store = new PropertiesStore([
            ["foo", "bar"],
            ["fu", "baz"],
            ["fizz", "buzz"],
          ]);

          store.on("change", changeCallback);

          assert.strictEqual(store.replace(/^f(oo|u)$/, callback), store);

          assert.strictEqual(changeCallback.mock.callCount(), 0);
        });
      });
    });

    describe("when thisArg is specified", () => {
      it('should invoke callback using thisArg as "this"', () => {
        const callback = mock.fn((value) => value.split("").reverse().join(""));
        const expected = [
          ["foo", "rab"],
          ["fu", "zab"],
          ["fizz", "buzz"],
        ];
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
          ["fizz", "buzz"],
        ]);
        const thisArg = {};

        assert.strictEqual(
          store.replace(/^f(oo|u)$/, callback, thisArg),
          store,
        );

        assert.deepStrictEqual(Array.from(store), expected);

        assert.strictEqual(callback.mock.callCount(), 2);

        assert.deepStrictEqual(callback.mock.calls[0]?.arguments, [
          "bar",
          "foo",
          store,
        ]);
        assert.strictEqual(callback.mock.calls[0]?.this, thisArg);

        assert.deepStrictEqual(callback.mock.calls[1]?.arguments, [
          "baz",
          "fu",
          store,
        ]);
        assert.strictEqual(callback.mock.calls[1]?.this, thisArg);
      });
    });
  });

  describe("#search", () => {
    it("should return iterator for each matching property key/value pair whose key matches regexp", () => {
      const store = new PropertiesStore([
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ]);

      let iterator = store.search(/foo/);

      assert.deepStrictEqual(iterator.next().value, ["foo", "bar"]);
      assert.strictEqual(iterator.next().value, undefined);

      assert.deepStrictEqual(Array.from(store.search(/foo/)), [["foo", "bar"]]);

      iterator = store.search(/^f/);

      assert.deepStrictEqual(iterator.next().value, ["foo", "bar"]);
      assert.deepStrictEqual(iterator.next().value, ["fu", "baz"]);
      assert.deepStrictEqual(iterator.next().value, ["fizz", "buzz"]);
      assert.strictEqual(iterator.next().value, undefined);

      assert.deepStrictEqual(Array.from(store.search(/^f/)), [
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ]);

      iterator = store.search(/^F\S{2,3}$/i);

      assert.deepStrictEqual(iterator.next().value, ["foo", "bar"]);
      assert.deepStrictEqual(iterator.next().value, ["fizz", "buzz"]);
      assert.strictEqual(iterator.next().value, undefined);

      assert.deepStrictEqual(Array.from(store.search(/^F\S{2,3}$/i)), [
        ["foo", "bar"],
        ["fizz", "buzz"],
      ]);
    });

    describe("when regexp matches no properties", () => {
      it("should return an empty iterator", () => {
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
        ]);

        const iterator = store.search(/^ba/);

        assert.strictEqual(iterator.next().value, undefined);

        assert.deepStrictEqual(Array.from(store.search(/^ba/)), []);
      });
    });
  });

  describe("#set", () => {
    describe("when no property exists for key", () => {
      it("should set property value for key and return PropertiesStore", () => {
        const expected = [["foo", "bar"]];
        const store = new PropertiesStore();

        assert.strictEqual(store.set("foo", "bar"), store);

        assert.deepStrictEqual(Array.from(store), expected);
      });

      it('should emit "change" event', () => {
        const changeCallback = mock.fn();
        const store = new PropertiesStore();

        store.on("change", changeCallback);

        assert.strictEqual(store.set("foo", "bar"), store);

        assert.strictEqual(changeCallback.mock.callCount(), 1);

        assert.deepStrictEqual(changeCallback.mock.calls[0]?.arguments, [
          {
            key: "foo",
            newValue: "bar",
            oldValue: undefined,
            properties: store,
          },
        ]);
      });
    });

    describe("when property exists for key", () => {
      it("should set property value for key and return PropertiesStore", () => {
        const expected = [
          ["foo", "quux"],
          ["fu", "baz"],
          ["fizz", "buzz"],
        ];
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
          ["fizz", "buzz"],
        ]);

        assert.strictEqual(store.set("foo", "quux"), store);

        assert.deepStrictEqual(Array.from(store), expected);
      });

      it('should emit "change" event', () => {
        const changeCallback = mock.fn();
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
          ["fizz", "buzz"],
        ]);

        store.on("change", changeCallback);

        assert.strictEqual(store.set("foo", "quux"), store);

        assert.strictEqual(changeCallback.mock.callCount(), 1);

        assert.deepStrictEqual(changeCallback.mock.calls[0]?.arguments, [
          {
            key: "foo",
            newValue: "quux",
            oldValue: "bar",
            properties: store,
          },
        ]);
      });

      describe("when value is same as existing", () => {
        it('should not emit "change"', () => {
          const changeCallback = mock.fn();
          const store = new PropertiesStore();

          assert.strictEqual(store.set("foo", "bar"), store);

          store.on("change", changeCallback);

          assert.strictEqual(store.set("foo", "bar"), store);

          assert.strictEqual(changeCallback.mock.callCount(), 0);
        });
      });
    });

    describe("when key is using different case", () => {
      it("should set property value for key and return PropertiesStore", () => {
        const expected = [
          ["foo", "bar"],
          ["FU", "baz"],
          ["FOO", "buzz"],
          ["fu", "quux"],
        ];
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["FU", "baz"],
        ]);

        assert.strictEqual(store.set("FOO", "buzz"), store);
        assert.strictEqual(store.set("fu", "quux"), store);

        assert.deepStrictEqual(Array.from(store), expected);
      });

      it('should emit "change" event', () => {
        const changeCallback = mock.fn();
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["FU", "baz"],
        ]);

        store.on("change", changeCallback);

        assert.strictEqual(store.set("FOO", "buzz"), store);
        assert.strictEqual(store.set("fu", "quux"), store);

        assert.strictEqual(changeCallback.mock.callCount(), 2);

        assert.deepStrictEqual(changeCallback.mock.calls[0]?.arguments, [
          {
            key: "FOO",
            newValue: "buzz",
            oldValue: undefined,
            properties: store,
          },
        ]);
        assert.deepStrictEqual(changeCallback.mock.calls[1]?.arguments, [
          {
            key: "fu",
            newValue: "quux",
            oldValue: undefined,
            properties: store,
          },
        ]);
      });
    });
  });

  describe("#store", () => {
    const expectedTimestampComment = "# Mon Oct 31 21:05:00 GMT 2016";

    beforeEach(() => {
      mock.timers.enable({ apis: ["Date"], now: 1477947900000 });
    });

    afterEach(() => {
      mock.timers.reset();
    });

    it("should write property lines to output", async () => {
      const output = new MockWritable();
      const expected = [expectedTimestampComment, "foo=bar", "fu=baz"].reduce(
        (memo, value) => `${memo}${value}${EOL}`,
        "",
      );
      const store = new PropertiesStore([
        ["foo", "bar"],
        ["fu", "baz"],
      ]);

      await store.store(output);

      assert.strictEqual(output.buffer.toString("latin1"), expected);
    });

    it('should emit "store" event', async () => {
      const storeCallback = mock.fn();
      const output = new MockWritable();
      const store = new PropertiesStore([
        ["foo", "bar"],
        ["fu", "baz"],
      ]);

      store.on("store", storeCallback);

      await store.store(output);

      assert.strictEqual(storeCallback.mock.callCount(), 1);

      assert.deepStrictEqual(storeCallback.mock.calls[0]?.arguments, [
        {
          options: {
            comments: undefined,
            disableTimestamp: false,
            disableUnicodeEscape: false,
            encoding: "latin1",
          },
          output,
          properties: store,
        },
      ]);
    });

    describe("when no properties exist", () => {
      it("should only write timestamp comment to output", async () => {
        const output = new MockWritable();
        const store = new PropertiesStore();

        await store.store(output);

        assert.strictEqual(
          output.buffer.toString("latin1"),
          `${expectedTimestampComment}${EOL}`,
        );
      });

      it('should emit "store" event', async () => {
        const storeCallback = mock.fn();
        const output = new MockWritable();
        const store = new PropertiesStore();

        store.on("store", storeCallback);

        await store.store(output);

        assert.strictEqual(storeCallback.mock.callCount(), 1);

        assert.deepStrictEqual(storeCallback.mock.calls[0]?.arguments, [
          {
            options: {
              comments: undefined,
              disableTimestamp: false,
              disableUnicodeEscape: false,
              encoding: "latin1",
            },
            output,
            properties: store,
          },
        ]);
      });
    });

    describe("when failed to write to output", () => {
      it("should throw an error", async () => {
        const expectedError = new Error("foo");
        const output = new MockWritable({ error: expectedError });
        const expectedOutput = "";
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
        ]);

        await assert.rejects(store.store(output), expectedError);

        assert.strictEqual(output.buffer.toString("latin1"), expectedOutput);
      });
    });

    describe("when comments option is not specified", () => {
      it("should only write timestamp comment and property lines to output", async () => {
        const output = new MockWritable();
        const expected = [expectedTimestampComment, "foo=bar", "fu=baz"].reduce(
          (memo, value) => `${memo}${value}${EOL}`,
          "",
        );
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
        ]);

        await store.store(output);

        assert.strictEqual(output.buffer.toString("latin1"), expected);
      });
    });

    describe("when comments option is specified", () => {
      it("should write comments before timestamp comment and property lines to output", async () => {
        const comments = "This is a comment";
        const output = new MockWritable();
        const expected = [
          `# ${comments}`,
          expectedTimestampComment,
          "foo=bar",
          "fu=baz",
        ].reduce((memo, value) => `${memo}${value}${EOL}`, "");
        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
        ]);

        await store.store(output, { comments });

        assert.strictEqual(output.buffer.toString("latin1"), expected);
      });

      describe("when no properties exist", () => {
        it("should only write comments and timestamp comment", async () => {
          const comments = "This is a comment";
          const output = new MockWritable();
          const expected = [`# ${comments}`, expectedTimestampComment].reduce(
            (memo, value) => `${memo}${value}${EOL}`,
            "",
          );
          const store = new PropertiesStore();

          await store.store(output, { comments });

          assert.strictEqual(output.buffer.toString("latin1"), expected);
        });
      });

      describe("when disableTimestamp option is false", () => {
        it("should write comments before timestamp comment and property lines to output", async () => {
          const comments = "This is a comment";
          const output = new MockWritable();
          const expected = [
            `# ${comments}`,
            expectedTimestampComment,
            "foo=bar",
            "fu=baz",
          ].reduce((memo, value) => `${memo}${value}${EOL}`, "");
          const store = new PropertiesStore([
            ["foo", "bar"],
            ["fu", "baz"],
          ]);

          await store.store(output, {
            comments,
            disableTimestamp: false,
          });

          assert.strictEqual(output.buffer.toString("latin1"), expected);
        });
      });

      describe("when disableTimestamp option is true", () => {
        it("should only write comments before property lines to output", async () => {
          const comments = "This is a comment";
          const output = new MockWritable();
          const expected = [`# ${comments}`, "foo=bar", "fu=baz"].reduce(
            (memo, value) => `${memo}${value}${EOL}`,
            "",
          );
          const store = new PropertiesStore([
            ["foo", "bar"],
            ["fu", "baz"],
          ]);

          await store.store(output, {
            comments,
            disableTimestamp: true,
          });

          assert.strictEqual(output.buffer.toString("latin1"), expected);
        });
      });

      describe("when disableUnicodeEscape option is false", () => {
        it("should escape non-ASCII characters within comments before being written to output", async () => {
          const comments = "This¥is¥a¥comment";
          const output = new MockWritable();
          const expected = [
            "# This\\u00a5is\\u00a5a\\u00a5comment",
            expectedTimestampComment,
          ].reduce((memo, value) => `${memo}${value}${EOL}`, "");
          const store = new PropertiesStore();

          await store.store(output, {
            comments,
            disableUnicodeEscape: false,
          });

          assert.strictEqual(output.buffer.toString("latin1"), expected);
        });
      });

      describe("when disableUnicodeEscape option is true", () => {
        it("should write non-ASCII characters within comments to output as-is", async () => {
          const comments = "This¥is¥a¥comment";
          const output = new MockWritable();
          const expected = [`# ${comments}`, expectedTimestampComment].reduce(
            (memo, value) => `${memo}${value}${EOL}`,
            "",
          );
          const store = new PropertiesStore();

          await store.store(output, {
            comments,
            disableUnicodeEscape: true,
            encoding: "utf8",
          });

          assert.strictEqual(output.buffer.toString("utf8"), expected);
        });
      });
    });

    describe("when disableTimestamp option is false", () => {
      it("should write timestamp comment before property lines to output", async () => {
        const output = new MockWritable();
        const expected = [expectedTimestampComment, "foo=bar", "fu=baz"].reduce(
          (memo, value) => `${memo}${value}${EOL}`,
          "",
        );

        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
        ]);

        await store.store(output, { disableTimestamp: false });

        assert.strictEqual(output.buffer.toString("latin1"), expected);
      });
    });

    describe("when disableTimestamp option is true", () => {
      it("should only write property lines to output", async () => {
        const output = new MockWritable();
        const expected = ["foo=bar", "fu=baz"].reduce(
          (memo, value) => `${memo}${value}${EOL}`,
          "",
        );

        const store = new PropertiesStore([
          ["foo", "bar"],
          ["fu", "baz"],
        ]);

        await store.store(output, { disableTimestamp: true });

        assert.strictEqual(output.buffer.toString("latin1"), expected);
      });
    });

    describe("when disableUnicodeEscape option is false", () => {
      it("should escape non-ASCII characters before being written to output", async () => {
        const output = new MockWritable();
        const expected = [
          expectedTimestampComment,
          "foo\\u00a5bar=fu\\u00a5baz",
        ].reduce((memo, value) => `${memo}${value}${EOL}`, "");

        const store = new PropertiesStore();
        store.set("foo¥bar", "fu¥baz");

        await store.store(output, {
          disableUnicodeEscape: false,
          encoding: "utf8",
        });

        assert.strictEqual(output.buffer.toString("utf8"), expected);
      });
    });

    describe("when disableUnicodeEscape option is true", () => {
      it("should write non-ASCII characters to output as-is", async () => {
        const output = new MockWritable();
        const expected = [expectedTimestampComment, "foo¥bar=fu¥baz"].reduce(
          (memo, value) => `${memo}${value}${EOL}`,
          "",
        );

        const store = new PropertiesStore();
        store.set("foo¥bar", "fu¥baz");

        await store.store(output, {
          disableUnicodeEscape: true,
          encoding: "utf8",
        });

        assert.equal(output.buffer.toString("utf8"), expected);
      });
    });

    describe("when encoding option is not specified", () => {
      it("should write output using latin1 encoding", async () => {
        const output = new MockWritable();
        const expected = [
          expectedTimestampComment,
          "foo\\u00a5bar=fu\\u00a5baz",
        ].reduce((memo, value) => `${memo}${value}${EOL}`, "");

        const store = new PropertiesStore();
        store.set("foo¥bar", "fu¥baz");

        await store.store(output);

        assert.strictEqual(output.buffer.toString("latin1"), expected);
      });
    });

    describe("when encoding option is specified", () => {
      it("should write output using encoding", async () => {
        const output = new MockWritable();
        const expected = [
          expectedTimestampComment,
          "foo\\u00a5bar=fu\\u00a5baz",
        ].reduce((memo, value) => `${memo}${value}${EOL}`, "");

        const store = new PropertiesStore();
        store.set("foo¥bar", "fu¥baz");

        await store.store(output, { encoding: "ascii" });

        assert.strictEqual(output.buffer.toString("ascii"), expected);
      });
    });
  });

  describe("#values", () => {
    it("should return iterator for each property value", () => {
      const properties: [string, string][] = [
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ];
      const expected = properties.map((entry) => entry[1]);
      const store = new PropertiesStore(properties);

      const iterator = store.values();

      assert.strictEqual(iterator.next().value, "bar");
      assert.strictEqual(iterator.next().value, "baz");
      assert.strictEqual(iterator.next().value, "buzz");
      assert.strictEqual(iterator.next().value, undefined);

      assert.deepStrictEqual(Array.from(store.values()), expected);
    });

    describe("when no properties exist", () => {
      it("should return an empty iterator", () => {
        const store = new PropertiesStore();
        const iterator = store.values();

        assert.strictEqual(iterator.next().value, undefined);

        assert.deepStrictEqual(Array.from(store.values()), []);
      });
    });
  });

  describe("#[Symbol.iterator]", () => {
    it("should return iterator for each property key/value pair", () => {
      const properties: [string, string][] = [
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ];
      const store = new PropertiesStore(properties);

      const iterator = store[Symbol.iterator]();

      assert.deepStrictEqual(iterator.next().value, ["foo", "bar"]);
      assert.deepStrictEqual(iterator.next().value, ["fu", "baz"]);
      assert.deepStrictEqual(iterator.next().value, ["fizz", "buzz"]);
      assert.strictEqual(iterator.next().value, undefined);

      assert.deepStrictEqual(Array.from(store), properties);
    });

    describe("when no properties exist", () => {
      it("should return an empty iterator", () => {
        const store = new PropertiesStore();
        const iterator = store[Symbol.iterator]();

        assert.strictEqual(iterator.next().value, undefined);

        assert.deepStrictEqual(Array.from(store), []);
      });
    });
  });

  describe("#size", () => {
    it("should return number of properties", () => {
      const store = new PropertiesStore([
        ["foo", "bar"],
        ["fu", "baz"],
        ["fizz", "buzz"],
      ]);

      assert.strictEqual(store.size, 3);
    });

    describe("when no properties exist", () => {
      it("should return zero", () => {
        const store = new PropertiesStore();

        assert.strictEqual(store.size, 0);
      });
    });
  });
});
