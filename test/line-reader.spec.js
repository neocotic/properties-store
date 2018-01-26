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

const { expect } = require('chai');

const LineReader = require('../src/line-reader');
const { MockReadable } = require('./mock-stream');
const PropertiesStore = require('../src/properties-store');

describe('LineReader', () => {
  let store;

  beforeEach(() => {
    store = new PropertiesStore();
  });

  describe('.read', () => {
    it('should read all property information from input', async() => {
      const input = new MockReadable(Buffer.from([
        '',
        '# foo',
        '! foo',
        'foo=bar',
        'fu:baz',
        'fizz buzz'
      ].join('\r\n'), 'latin1'));
      const expected = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ],
        [ 'fizz', 'buzz' ]
      ];
      const reader = new LineReader(input, { encoding: 'latin1' });

      await reader.read(store);

      expect(Array.from(store)).to.deep.equal(expected);
    });

    it('should read multi-line property values from input', async() => {
      const input = new MockReadable(Buffer.from([
        'foo=b\\\r\\a\\\nr',
        ' fu : b \\\r\n\\ a \\\n z ',
        'fizz buzz\\'
      ].join('\r\n'), 'latin1'));
      const expected = [
        [ 'foo', 'bar' ],
        [ 'fu', 'b  a z ' ],
        [ 'fizz', 'buzz' ]
      ];
      const reader = new LineReader(input, { encoding: 'latin1' });

      await reader.read(store);

      expect(Array.from(store)).to.deep.equal(expected);
    });

    it('should convert property information once read from input', async() => {
      const tests = {
        '=': [
          [ '', '' ]
        ],
        '=bar': [
          [ '', 'bar' ]
        ],
        'foo': [
          [ 'foo', '' ]
        ],
        'foo=': [
          [ 'foo', '' ]
        ],
        'foo bar': [
          [ 'foo', 'bar' ]
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
        ],
        'foo\f\n\r\t=bar\f\n\r\t': [
          [ 'foo', '' ],
          [ '', 'bar\f' ]
        ],
        'foo=:#!=bar=\\:\\#\\!': [
          [ 'foo', ':#!=bar=:#!' ]
        ],
        'foo\\u00a5bar=fu\\u00a5baz': [
          [ 'foo¥bar', 'fu¥baz' ]
        ]
      };

      for (const [ inputString, expected ] of Object.entries(tests)) {
        const input = new MockReadable(Buffer.from(inputString, 'latin1'));

        store.clear();

        const reader = new LineReader(input, { encoding: 'latin1' });

        await reader.read(store);

        expect(Array.from(store)).to.deep.equal(expected);
      }
    });

    it('should be able to read very large lines', async() => {
      const key = 'a'.repeat(8192);
      const value = 'b'.repeat(8192);
      const input = new MockReadable(Buffer.from(`${key}=${value}`, 'latin1'));
      const expected = [
        [ key, value ]
      ];
      const reader = new LineReader(input, { encoding: 'latin1' });

      await reader.read(store);

      expect(Array.from(store)).to.deep.equal(expected);
    });

    it('should read input using encoding option', async() => {
      const encodings = [ 'latin1', 'utf8' ];

      for (const encoding of encodings) {
        const input = new MockReadable(Buffer.from('foo¥bar=fu¥baz', encoding));
        const expected = [
          [ 'foo¥bar', 'fu¥baz' ]
        ];
        const reader = new LineReader(input, { encoding });

        await reader.read(store);

        expect(Array.from(store)).to.deep.equal(expected);
      }
    });

    context('when input contains no property lines', () => {
      it('should read no properties', async() => {
        const input = new MockReadable(Buffer.from([
          '',
          '# foo'
        ].join('\n'), 'latin1'));
        const expected = [];
        const reader = new LineReader(input, { encoding: 'latin1' });

        await reader.read(input);

        expect(Array.from(store)).to.deep.equal(expected);
      });
    });

    context('when input is empty', () => {
      it('should read no properties', async() => {
        const input = new MockReadable();
        const reader = new LineReader(input, { encoding: 'latin1' });

        await reader.read(input);

        expect(store.size).to.equal(0);
      });
    });

    context('when input is TTY', () => {
      it('should read no properties', async() => {
        const input = new MockReadable(Buffer.from('foo=bar', 'latin1'));
        input.isTTY = true;
        const reader = new LineReader(input, { encoding: 'latin1' });

        await reader.read(input);

        expect(store.size).to.equal(0);
      });
    });

    context('when failed to read from input', () => {
      it('should throw an error', async() => {
        const expectedError = new Error('foo');
        const input = new MockReadable(null, expectedError);
        const reader = new LineReader(input, { encoding: 'latin1' });

        try {
          await reader.read(store);
          // Should have thrown
          expect.fail();
        } catch (e) {
          expect(e).to.equal(expectedError);
        }

        expect(store.size).to.equal(0);
      });
    });
  });
});
