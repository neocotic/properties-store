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

const assert = require('assert');
const { EOL } = require('os');
const moment = require('moment-timezone');
const sinon = require('sinon');

const { MockWritable } = require('./mock-stream');
const PropertiesStore = require('../src/properties-store');
const PropertiesWriter = require('../src/properties-writer');

describe('PropertiesWriter', () => {
  let store;

  beforeEach(() => {
    store = new PropertiesStore();
  });

  describe('#write', () => {
    const expectedTimestampComment = '#Mon Oct 31 21:05:00 GMT 2016';
    let mockClock;

    beforeEach(() => {
      sinon.stub(moment.tz, 'guess').returns('GMT');
      mockClock = sinon.useFakeTimers(1477947900000);
    });

    afterEach(() => {
      moment.tz.guess.restore();
      mockClock.restore();
    });

    it('should write property key/value pairs on separate lines to output', async() => {
      const output = new MockWritable();
      const expected = [
        expectedTimestampComment,
        'foo=bar',
        'fu=baz'
      ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

      store.set('foo', 'bar');
      store.set('fu', 'baz');

      const writer = new PropertiesWriter(output, { encoding: 'latin1' });

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

        const writer = new PropertiesWriter(output, { encoding: 'latin1' });

        await writer.write(store);

        assert.equal(output.buffer.toString('latin1'), `${expectedTimestampComment}${EOL}${expected}${EOL}`);
      }
    });

    it('should write output using encoding option', async() => {
      const latin1Output = new MockWritable();
      const utf8Output = new MockWritable();
      const expected = [
        expectedTimestampComment,
        'foo¥bar=fu¥baz'
      ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

      store.set('foo¥bar', 'fu¥baz');

      const latin1Writer = new PropertiesWriter(latin1Output, { encoding: 'latin1' });
      const utf8Writer = new PropertiesWriter(utf8Output, { encoding: 'utf8' });

      await latin1Writer.write(store);
      await utf8Writer.write(store);

      assert.equal(latin1Output.buffer.toString('latin1'), expected);
      assert.equal(utf8Output.buffer.toString('utf8'), expected);
      assert.notDeepEqual(latin1Output.buffer, utf8Output.buffer);
    });

    context('when no properties exist', () => {
      it('should only write timestamp comment to output', async() => {
        const output = new MockWritable();
        const writer = new PropertiesWriter(output, { encoding: 'latin1' });

        await writer.write(store);

        assert.equal(output.buffer.toString('latin1'), `${expectedTimestampComment}${EOL}`);
      });
    });

    context('when failed to write to output', () => {
      it('should throw an error', async() => {
        const expectedError = new Error('foo');
        const output = new MockWritable(null, expectedError);
        const expectedOutput = '';

        store.set('foo', 'bar');
        store.set('fu', 'baz');

        const writer = new PropertiesWriter(output, { encoding: 'latin1' });

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

    context('when comments option is not null', () => {
      it('should write comments before timestamp comment and property lines to output', async() => {
        const comments = 'This is a comment';
        const output = new MockWritable();
        const expected = [
          `#${comments}`,
          expectedTimestampComment,
          'foo=bar',
          'fu=baz'
        ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

        store.set('foo', 'bar');
        store.set('fu', 'baz');

        const writer = new PropertiesWriter(output, {
          comments,
          encoding: 'latin1'
        });

        await writer.write(store);

        assert.equal(output.buffer.toString('latin1'), expected);
      });

      it('should write multi-line comments', async() => {
        const comments = 'This\ris\r\na\n\nmulti-line\ncomment\n';
        const output = new MockWritable();
        const expected = [
          '#This',
          '#is',
          '#a',
          '#',
          '#multi-line',
          '#comment',
          '#',
          expectedTimestampComment,
          'foo=bar',
          'fu=baz'
        ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

        store.set('foo', 'bar');
        store.set('fu', 'baz');

        const writer = new PropertiesWriter(output, {
          comments,
          encoding: 'latin1'
        });

        await writer.write(store);

        assert.equal(output.buffer.toString('latin1'), expected);
      });

      it('should write valid prefixes in comments', async() => {
        const comments = 'This#is!a#comment';
        const output = new MockWritable();
        const expected = [
          `#${comments}`,
          expectedTimestampComment,
          'foo=bar',
          'fu=baz'
        ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

        store.set('foo', 'bar');
        store.set('fu', 'baz');

        const writer = new PropertiesWriter(output, {
          comments,
          encoding: 'latin1'
        });

        await writer.write(store);

        assert.equal(output.buffer.toString('latin1'), expected);
      });

      it('should write valid prefixes in multi-line comments', async() => {
        const comments = 'This\ris\r\na\n\n#multi-line\n!comment\n';
        const output = new MockWritable();
        const expected = [
          '#This',
          '#is',
          '#a',
          '#',
          '#multi-line',
          '!comment',
          '#',
          expectedTimestampComment,
          'foo=bar',
          'fu=baz'
        ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

        store.set('foo', 'bar');
        store.set('fu', 'baz');

        const writer = new PropertiesWriter(output, {
          comments,
          encoding: 'latin1'
        });

        await writer.write(store);

        assert.equal(output.buffer.toString('latin1'), expected);
      });

      context('and comments option is an empty string', () => {
        it('should write empty comment before timestamp comment and property lines to output', async() => {
          const output = new MockWritable();
          const expected = [
            '#',
            expectedTimestampComment,
            'foo=bar',
            'fu=baz'
          ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

          store.set('foo', 'bar');
          store.set('fu', 'baz');

          const writer = new PropertiesWriter(output, {
            comments: '',
            encoding: 'latin1'
          });

          await writer.write(store);

          assert.equal(output.buffer.toString('latin1'), expected);
        });
      });

      context('and no properties exist', () => {
        it('should only write comments and timestamp comment', async() => {
          const comments = 'This is a comment';
          const output = new MockWritable();
          const expected = [
            `#${comments}`,
            expectedTimestampComment
          ].reduce((memo, value) => `${memo}${value}${EOL}`, '');
          const writer = new PropertiesWriter(output, {
            comments,
            encoding: 'latin1'
          });

          await writer.write(store);

          assert.equal(output.buffer.toString('latin1'), expected);
        });
      });

      context('and escapeUnicode option is disabled', () => {
        it('should write non-ASCII characters within comments to output as-is', async() => {
          const comments = 'This¥is¥a¥comment';
          const output = new MockWritable();
          const expected = [
            `#${comments}`,
            expectedTimestampComment,
            'foo¥bar=fu¥baz'
          ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

          store.set('foo¥bar', 'fu¥baz');

          const writer = new PropertiesWriter(output, {
            comments,
            encoding: 'utf8',
            escapeUnicode: false
          });

          await writer.write(store);

          assert.equal(output.buffer.toString('utf8'), expected);
        });
      });

      context('and escapeUnicode option is enabled', () => {
        it('should escape non-ASCII characters within comments before being written to output', async() => {
          const comments = 'This¥is¥a¥comment';
          const output = new MockWritable();
          const expected = [
            '#This\\u00a5is\\u00a5a\\u00a5comment',
            expectedTimestampComment,
            'foo\\u00a5bar=fu\\u00a5baz'
          ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

          store.set('foo¥bar', 'fu¥baz');

          const writer = new PropertiesWriter(output, {
            comments,
            encoding: 'ascii',
            escapeUnicode: true
          });

          await writer.write(store);

          assert.equal(output.buffer.toString('ascii'), expected);
        });
      });
    });

    context('when comments option is null', () => {
      it('should only write timestamp comment and property lines to output', async() => {
        const output = new MockWritable();
        const expected = [
          expectedTimestampComment,
          'foo=bar',
          'fu=baz'
        ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

        store.set('foo', 'bar');
        store.set('fu', 'baz');

        const writer = new PropertiesWriter(output, {
          comments: null,
          encoding: 'latin1'
        });

        await writer.write(store);

        assert.equal(output.buffer.toString('latin1'), expected);
      });
    });

    context('when escapeUnicode option is disabled', () => {
      it('should write non-ASCII characters to output as-is', async() => {
        const output = new MockWritable();
        const expected = [
          expectedTimestampComment,
          'foo¥bar=fu¥baz'
        ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

        store.set('foo¥bar', 'fu¥baz');

        const writer = new PropertiesWriter(output, {
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
        const expected = [
          expectedTimestampComment,
          'foo\\u00a5bar=fu\\u00a5baz'
        ].reduce((memo, value) => `${memo}${value}${EOL}`, '');

        store.set('foo¥bar', 'fu¥baz');

        const writer = new PropertiesWriter(output, {
          encoding: 'ascii',
          escapeUnicode: true
        });

        await writer.write(store);

        assert.equal(output.buffer.toString('ascii'), expected);
      });
    });
  });
});
