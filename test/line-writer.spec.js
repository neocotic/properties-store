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

const assert = require('assert');
const { EOL } = require('os');

const LineWriter = require('../src/line-writer');
const { MockWritable } = require('./mock-stream');
const PropertiesStore = require('../src/properties-store');

describe('LineWriter', () => {
  let store;

  beforeEach(() => {
    store = new PropertiesStore();
  });

  describe('.writeLine', () => {
    it('should write str to output', async() => {
      const output = new MockWritable();
      const expected = `foo${EOL}`;

      await LineWriter.writeLine(output, 'foo', { encoding: 'latin1' });

      assert.equal(output.buffer.toString('latin1'), expected);
    });

    it('should write output using encoding option', async() => {
      const latin1Output = new MockWritable();
      const utf8Output = new MockWritable();
      const expected = `foo¥bar${EOL}`;

      await LineWriter.writeLine(latin1Output, 'foo¥bar', { encoding: 'latin1' });
      await LineWriter.writeLine(utf8Output, 'foo¥bar', { encoding: 'utf8' });

      assert.equal(latin1Output.buffer.toString('latin1'), expected);
      assert.equal(utf8Output.buffer.toString('utf8'), expected);
      assert.notDeepEqual(latin1Output.buffer, utf8Output.buffer);
    });

    context('when failed to write to output', () => {
      it('should throw an error', async() => {
        const expectedError = new Error('foo');
        const output = new MockWritable(null, expectedError);
        const expectedOutput = '';

        try {
          await LineWriter.writeLine(output, 'foo', { encoding: 'latin1' });
          // Should have thrown
          assert.fail();
        } catch (e) {
          assert.strictEqual(e, expectedError);
        }

        assert.equal(output.buffer.toString('latin1'), expectedOutput);
      });
    });
  });

  describe('#write', () => {
    it('should write property key/value pairs on separate lines to output', async() => {
      const output = new MockWritable();
      const expected = [
        'foo=bar',
        'fu=baz'
      ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

      store.set('foo', 'bar');
      store.set('fu', 'baz');

      const writer = new LineWriter(output, { encoding: 'latin1' });

      await writer.write(store);

      assert.equal(output.buffer.toString('latin1'), expected);
    });

    it('should convert property key/value pairs before being written to output', async() => {
      const tests = {
        '=': [
          [ '', '' ]
        ],
        '=bar': [
          [ '', 'bar' ]
        ],
        'foo=': [
          [ 'foo', '' ]
        ],
        'foo\\ bar=': [
          [ 'foo bar', '' ]
        ],
        'foo=bar': [
          [ 'foo', 'bar' ]
        ],
        'foo1=bar2': [
          [ 'foo1', 'bar2' ]
        ],
        '1foo=2bar': [
          [ '1foo', '2bar' ]
        ],
        '\\ foo\\ =\\ bar ': [
          [ ' foo ', ' bar ' ]
        ],
        'f\\\\oo=ba\\\\r': [
          [ 'f\\oo', 'ba\\r' ]
        ],
        'foo\\f\\n\\r\\t=bar\\f\\n\\r\\t': [
          [ 'foo\f\n\r\t', 'bar\f\n\r\t' ]
        ],
        'foo\\=\\:\\#\\!=bar\\=\\:\\#\\!': [
          [ 'foo=:#!', 'bar=:#!' ]
        ]
      };

      for (const [ expected, properties ] of Object.entries(tests)) {
        const output = new MockWritable();

        store.clear();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        const writer = new LineWriter(output, { encoding: 'latin1' });

        await writer.write(store);

        assert.equal(output.buffer.toString('latin1'), `${expected}${EOL}`);
      }
    });

    it('should write output using encoding option', async() => {
      const latin1Output = new MockWritable();
      const utf8Output = new MockWritable();
      const expected = `foo¥bar=fu¥baz${EOL}`;

      store.set('foo¥bar', 'fu¥baz');

      const latin1Writer = new LineWriter(latin1Output, { encoding: 'latin1' });
      const utf8Writer = new LineWriter(utf8Output, { encoding: 'utf8' });

      await latin1Writer.write(store);
      await utf8Writer.write(store);

      assert.equal(latin1Output.buffer.toString('latin1'), expected);
      assert.equal(utf8Output.buffer.toString('utf8'), expected);
      assert.notDeepEqual(latin1Output.buffer, utf8Output.buffer);
    });

    context('when no properties exist', () => {
      it('should write empty buffer to output', async() => {
        const output = new MockWritable();
        const expected = '';
        const writer = new LineWriter(output, { encoding: 'latin1' });

        await writer.write(store);

        assert.equal(output.buffer.toString('latin1'), expected);
      });
    });

    context('when failed to write to output', () => {
      it('should throw an error', async() => {
        const expectedError = new Error('foo');
        const output = new MockWritable(null, expectedError);
        const expectedOutput = '';

        store.set('foo', 'bar');
        store.set('fu', 'baz');

        const writer = new LineWriter(output, { encoding: 'latin1' });

        try {
          await writer.write(store);
          // Should have thrown
          assert.fail();
        } catch (e) {
          assert.strictEqual(e, expectedError);
        }

        assert.equal(output.buffer.toString('latin1'), expectedOutput);
      });
    });

    context('when escapeUnicode option is disabled', () => {
      it('should write non-ASCII characters to output as-is', async() => {
        const output = new MockWritable();
        const expected = `foo¥bar=fu¥baz${EOL}`;

        store.set('foo¥bar', 'fu¥baz');

        const writer = new LineWriter(output, {
          encoding: 'utf8',
          escapeUnicode: false
        });

        await writer.write(store);

        assert.equal(output.buffer.toString('utf8'), expected);
      });
    });

    context('when escapeUnicode option is enabled', () => {
      it('should escape non-ASCII characters before being written to output', async() => {
        const output = new MockWritable();
        const expected = `foo\\u00a5bar=fu\\u00a5baz${EOL}`;

        store.set('foo¥bar', 'fu¥baz');

        const writer = new LineWriter(output, {
          encoding: 'ascii',
          escapeUnicode: true
        });

        await writer.write(store);

        assert.equal(output.buffer.toString('ascii'), expected);
      });
    });
  });
});
