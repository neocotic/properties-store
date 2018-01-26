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

const { EOL } = require('os');
const { expect } = require('chai');
const sinon = require('sinon');

const { MockReadable, MockWritable } = require('./mock-stream');
const PropertiesStore = require('../src/properties-store');

describe('PropertiesStore', () => {
  describe('.load', () => {
    it('should create PropertiesStore loaded with properties read from input', async() => {
      const input = new MockReadable(Buffer.from([
        '',
        '# foo',
        'foo=bar'
      ].join('\n')));
      const expected = [
        [ 'foo', 'bar' ]
      ];

      const store = await PropertiesStore.load(input);

      expect(Array.from(store)).to.deep.equal(expected);
    });

    context('when encoding option is not specified', () => {
      it('should read input using latin1 encoding', async() => {
        const input = new MockReadable(Buffer.from('foo¥bar=fu¥baz'));
        const expected = [
          [ Buffer.from('foo¥bar').toString('latin1'), Buffer.from('fu¥baz').toString('latin1') ]
        ];

        const store = await PropertiesStore.load(input);

        expect(Array.from(store)).to.deep.equal(expected);
      });
    });

    context('when encoding option is specified', () => {
      it('should read input using encoding', async() => {
        const input = new MockReadable(Buffer.from('foo¥bar=fu¥baz'));
        const expected = [
          [ 'foo¥bar', 'fu¥baz' ]
        ];

        const store = await PropertiesStore.load(input, { encoding: 'utf8' });

        expect(Array.from(store)).to.deep.equal(expected);
      });
    });
  });

  it('should contain no properties initially', () => {
    const expected = [];
    const store = new PropertiesStore();

    expect(Array.from(store)).to.deep.equal(expected);
  });

  context('when store is specified', () => {
    it('should contain properties from store initially', () => {
      const properties = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ]
      ];
      const other = new PropertiesStore();

      for (const [ key, value ] of properties) {
        other.set(key, value);
      }

      const store = new PropertiesStore(other);

      expect(Array.from(store)).to.deep.equal(properties);
    });

    it('should not reflect any changes to store afterwards', () => {
      const properties = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ]
      ];
      const other = new PropertiesStore();

      for (const [ key, value ] of properties) {
        other.set(key, value);
      }

      const store = new PropertiesStore(other);

      other.clear();

      expect(Array.from(store)).to.deep.equal(properties);
    });
  });

  describe('#clear', () => {
    it('should remove all properties', () => {
      const properties = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ],
        [ 'fizz', 'buzz' ]
      ];
      const store = new PropertiesStore();

      for (const [ key, value ] of properties) {
        store.set(key, value);
      }

      store.clear();

      expect(Array.from(store)).to.deep.equal([]);
    });

    it('should emit single "clear" event and a "delete" event for each removed property', () => {
      const clearCallback = sinon.spy();
      const deleteCallback = sinon.spy();
      const properties = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ],
        [ 'fizz', 'buzz' ]
      ];
      const store = new PropertiesStore();

      for (const [ key, value ] of properties) {
        store.set(key, value);
      }

      store.on('clear', clearCallback);
      store.on('delete', deleteCallback);

      store.clear();

      expect(clearCallback.callCount).to.equal(1);
      expect(deleteCallback.callCount).to.equal(3);

      const clearCalls = clearCallback.getCalls();

      expect(clearCalls[0].args).to.deep.equal([
        { properties: store }
      ]);

      const deleteCalls = deleteCallback.getCalls();

      expect(deleteCalls[0].args).to.deep.equal([
        {
          key: 'foo',
          properties: store,
          value: 'bar'
        }
      ]);
      expect(deleteCalls[1].args).to.deep.equal([
        {
          key: 'fu',
          properties: store,
          value: 'baz'
        }
      ]);
      expect(deleteCalls[2].args).to.deep.equal([
        {
          key: 'fizz',
          properties: store,
          value: 'buzz'
        }
      ]);
    });

    context('when no properties exist', () => {
      it('should emit "clear" event but not "delete" event', () => {
        const clearCallback = sinon.spy();
        const deleteCallback = sinon.spy();
        const store = new PropertiesStore();

        store.on('clear', clearCallback);
        store.on('delete', deleteCallback);

        store.clear();

        expect(clearCallback.callCount).to.equal(1);
        expect(deleteCallback.callCount).to.equal(0);

        const clearCalls = clearCallback.getCalls();

        expect(clearCalls[0].args).to.deep.equal([
          { properties: store }
        ]);
      });
    });
  });

  describe('#delete', () => {
    it('should remove property for key and return true', () => {
      const properties = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ],
        [ 'fizz', 'buzz' ]
      ];
      const expected = properties.slice(1);
      const store = new PropertiesStore();

      for (const [ key, value ] of properties) {
        store.set(key, value);
      }

      expect(store.delete('foo')).to.equal(true);

      expect(Array.from(store)).to.deep.equal(expected);
    });

    it('should emit "delete" event', () => {
      const deleteCallback = sinon.spy();
      const properties = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ],
        [ 'fizz', 'buzz' ]
      ];
      const store = new PropertiesStore();

      for (const [ key, value ] of properties) {
        store.set(key, value);
      }

      store.on('delete', deleteCallback);

      expect(store.delete('foo')).to.equal(true);

      expect(deleteCallback.callCount).to.equal(1);

      const deleteCalls = deleteCallback.getCalls();

      expect(deleteCalls[0].args).to.deep.equal([
        {
          key: 'foo',
          properties: store,
          value: 'bar'
        }
      ]);
    });

    context('when no property exists for key', () => {
      it('should not remove any property and return false', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store.delete('fizz')).to.equal(false);

        expect(Array.from(store)).to.deep.equal(properties);
      });

      it('should not emit "delete" event', () => {
        const deleteCallback = sinon.spy();
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        store.on('delete', deleteCallback);

        expect(store.delete('fizz')).to.equal(false);

        expect(deleteCallback.callCount).to.equal(0);
      });
    });

    context('when key is using different case', () => {
      it('should not remove any property and return false', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'FU', 'baz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store.delete('FOO')).to.equal(false);
        expect(store.delete('fu')).to.equal(false);

        expect(Array.from(store)).to.deep.equal(properties);
      });

      it('should not emit "delete" event', () => {
        const deleteCallback = sinon.spy();
        const properties = [
          [ 'foo', 'bar' ],
          [ 'FU', 'baz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        store.on('delete', deleteCallback);

        expect(store.delete('FOO')).to.equal(false);
        expect(store.delete('fu')).to.equal(false);

        expect(deleteCallback.callCount).to.equal(0);
      });
    });

    context('when key is null', () => {
      it('should not remove any property and return false', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store.delete(null)).to.equal(false);

        expect(Array.from(store)).to.deep.equal(properties);
      });

      it('should not emit "delete" event', () => {
        const deleteCallback = sinon.spy();
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        store.on('delete', deleteCallback);

        expect(store.delete(null)).to.equal(false);

        expect(deleteCallback.callCount).to.equal(0);
      });
    });
  });

  describe('#entries', () => {
    it('should return iterator for each property key/value pair', () => {
      const properties = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ],
        [ 'fizz', 'buzz' ]
      ];
      const store = new PropertiesStore();

      for (const [ key, value ] of properties) {
        store.set(key, value);
      }

      const iterator = store.entries();

      expect(iterator.next().value).to.deep.equal([ 'foo', 'bar' ]);
      expect(iterator.next().value).to.deep.equal([ 'fu', 'baz' ]);
      expect(iterator.next().value).to.deep.equal([ 'fizz', 'buzz' ]);
      expect(iterator.next().value).to.equal(undefined);

      expect(Array.from(store.entries())).to.deep.equal(properties);
    });

    context('when no properties exist', () => {
      it('should return an empty iterator', () => {
        const store = new PropertiesStore();
        const iterator = store.entries();

        expect(iterator.next().value).to.equal(undefined);

        expect(Array.from(store.entries())).to.deep.equal([]);
      });
    });
  });

  describe('#forEach', () => {
    it('should invoke callback with each property key/value pair', () => {
      const callback = sinon.stub();
      const properties = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ],
        [ 'fizz', 'buzz' ]
      ];
      const store = new PropertiesStore();

      for (const [ key, value ] of properties) {
        store.set(key, value);
      }

      store.forEach(callback);

      expect(callback.callCount).to.equal(3);

      const calls = callback.getCalls();

      expect(calls[0].args).to.deep.equal([ 'bar', 'foo', store ]);
      expect(calls[0].thisValue).to.equal(undefined);

      expect(calls[1].args).to.deep.equal([ 'baz', 'fu', store ]);
      expect(calls[1].thisValue).to.equal(undefined);

      expect(calls[2].args).to.deep.equal([ 'buzz', 'fizz', store ]);
      expect(calls[2].thisValue).to.equal(undefined);
    });

    context('when no properties exist', () => {
      it('should not invoke callback', () => {
        const callback = sinon.stub();
        const store = new PropertiesStore();

        store.forEach(callback);

        expect(callback.callCount).to.equal(0);
      });
    });

    context('when thisArg is specified', () => {
      it('should invoke callback using thisArg as "this"', () => {
        const callback = sinon.stub();
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const store = new PropertiesStore();
        const thisArg = {};

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        store.forEach(callback, thisArg);

        expect(callback.callCount).to.equal(3);

        const calls = callback.getCalls();

        expect(calls[0].args).to.deep.equal([ 'bar', 'foo', store ]);
        expect(calls[0].thisValue).to.equal(thisArg);

        expect(calls[1].args).to.deep.equal([ 'baz', 'fu', store ]);
        expect(calls[1].thisValue).to.equal(thisArg);

        expect(calls[2].args).to.deep.equal([ 'buzz', 'fizz', store ]);
        expect(calls[2].thisValue).to.equal(thisArg);
      });
    });
  });

  describe('#get', () => {
    context('when property exists for key', () => {
      it('should return value of property for key', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store.get('foo')).to.equal('bar');
        expect(store.get('fu')).to.equal('baz');
        expect(store.get('fizz')).to.equal('buzz');
      });
    });

    context('when no property exists for key', () => {
      context('and defaultValue is specified', () => {
        it('should return string representation of defaultValue', () => {
          const properties = [
            [ 'foo', 'bar' ],
            [ 'fu', 'baz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          expect(store.get('fizz', '123')).to.equal('123');
          expect(store.get('fizz', 123)).to.equal('123');
          expect(store.get('fizz', false)).to.equal('false');
        });
      });

      context('and defaultValue is null', () => {
        it('should return null', () => {
          const properties = [
            [ 'foo', 'bar' ],
            [ 'fu', 'baz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          expect(store.get('fizz', null)).to.equal(null);
        });
      });

      context('and defaultValue is omitted', () => {
        it('should return undefined', () => {
          const properties = [
            [ 'foo', 'bar' ],
            [ 'fu', 'baz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          expect(store.get('fizz')).to.equal(undefined);
        });
      });
    });

    context('when key is using different case', () => {
      context('and defaultValue is specified', () => {
        it('should return string representation of defaultValue', () => {
          const properties = [
            [ 'foo', 'bar' ],
            [ 'FU', 'baz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          expect(store.get('FOO', '123')).to.equal('123');
          expect(store.get('fu', 123)).to.equal('123');
          expect(store.get('FOO', false)).to.equal('false');
        });
      });

      context('and defaultValue is null', () => {
        it('should return null', () => {
          const properties = [
            [ 'foo', 'bar' ],
            [ 'FU', 'baz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          expect(store.get('FOO', null)).to.equal(null);
          expect(store.get('fu', null)).to.equal(null);
        });
      });

      context('and defaultValue is omitted', () => {
        it('should return undefined', () => {
          const properties = [
            [ 'foo', 'bar' ],
            [ 'FU', 'baz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          expect(store.get('FOO')).to.equal(undefined);
          expect(store.get('fu')).to.equal(undefined);
        });
      });
    });

    context('when key is null', () => {
      context('and defaultValue is specified', () => {
        it('should return string representation of defaultValue', () => {
          const properties = [
            [ 'foo', 'bar' ],
            [ 'fu', 'baz' ],
            [ 'fizz', 'buzz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          expect(store.get(null, '123')).to.equal('123');
          expect(store.get(null, 123)).to.equal('123');
          expect(store.get(null, false)).to.equal('false');
        });
      });

      context('and defaultValue is null', () => {
        it('should return null', () => {
          const properties = [
            [ 'foo', 'bar' ],
            [ 'FU', 'baz' ],
            [ 'fizz', 'buzz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          expect(store.get(null, null)).to.equal(null);
          expect(store.get(null, null)).to.equal(null);
        });
      });

      context('and defaultValue is omitted', () => {
        it('should return undefined', () => {
          const properties = [
            [ 'foo', 'bar' ],
            [ 'FU', 'baz' ],
            [ 'fizz', 'buzz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          expect(store.get(null)).to.equal(undefined);
          expect(store.get(null)).to.equal(undefined);
        });
      });
    });
  });

  describe('#has', () => {
    context('when a property exists for key', () => {
      it('should return true', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store.has('foo')).to.equal(true);
      });
    });

    context('when no property exist for key', () => {
      it('should return false', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store.has('fizz')).to.equal(false);
      });
    });

    context('when key is using different case', () => {
      it('should return false', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'FU', 'baz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store.has('FOO')).to.equal(false);
        expect(store.has('fu')).to.equal(false);
      });
    });

    context('when key is null', () => {
      it('should return false', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store.has(null)).to.equal(false);
      });
    });
  });

  describe('#keys', () => {
    it('should return iterator for each property key', () => {
      const properties = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ],
        [ 'fizz', 'buzz' ]
      ];
      const expected = properties.map(([ key ]) => key);
      const store = new PropertiesStore();

      for (const [ key, value ] of properties) {
        store.set(key, value);
      }

      const iterator = store.keys();

      expect(iterator.next().value).to.equal('foo');
      expect(iterator.next().value).to.equal('fu');
      expect(iterator.next().value).to.equal('fizz');
      expect(iterator.next().value).to.equal(undefined);

      expect(Array.from(store.keys())).to.deep.equal(expected);
    });

    context('when no properties exist', () => {
      it('should return an empty iterator', () => {
        const store = new PropertiesStore();
        const iterator = store.keys();

        expect(iterator.next().value).to.equal(undefined);

        expect(Array.from(store.keys())).to.deep.equal([]);
      });
    });
  });

  describe('#load', () => {
    it('should read properties from input', async() => {
      const input = new MockReadable(Buffer.from([
        '',
        '# foo',
        'foo=bar'
      ].join('\n')));
      const expected = [
        [ 'foo', 'bar' ]
      ];
      const store = new PropertiesStore();

      await store.load(input);

      expect(Array.from(store)).to.deep.equal(expected);
    });

    it('should emit "load" event and a "change" event for each changed property', async() => {
      const changeCallback = sinon.spy();
      const loadCallback = sinon.spy();
      const input = new MockReadable(Buffer.from([
        '',
        '# foo',
        'foo=bar',
        '',
        'foo=baz',
        'foo=buzz',
        '',
        'fu=bar'
      ].join('\n')));
      const store = new PropertiesStore();

      store.on('change', changeCallback);
      store.on('load', loadCallback);

      await store.load(input);

      expect(changeCallback.callCount).to.equal(4);
      expect(loadCallback.callCount).to.equal(1);

      const changeCalls = changeCallback.getCalls();

      expect(changeCalls[0].args).to.deep.equal([
        {
          key: 'foo',
          newValue: 'bar',
          oldValue: undefined,
          properties: store
        }
      ]);
      expect(changeCalls[1].args).to.deep.equal([
        {
          key: 'foo',
          newValue: 'baz',
          oldValue: 'bar',
          properties: store
        }
      ]);
      expect(changeCalls[2].args).to.deep.equal([
        {
          key: 'foo',
          newValue: 'buzz',
          oldValue: 'baz',
          properties: store
        }
      ]);
      expect(changeCalls[3].args).to.deep.equal([
        {
          key: 'fu',
          newValue: 'bar',
          oldValue: undefined,
          properties: store
        }
      ]);

      const loadCalls = loadCallback.getCalls();

      expect(loadCalls[0].args).to.deep.equal([
        {
          input,
          options: { encoding: 'latin1' },
          properties: store
        }
      ]);
    });

    it('should extend existing properties', async() => {
      const input = new MockReadable(Buffer.from([
        '',
        '# foo',
        'foo=buzz',
        '',
        'fu=baz'
      ].join('\n')));
      const expected = [
        [ 'foo', 'buzz' ],
        [ 'fu', 'baz' ]
      ];
      const store = new PropertiesStore();
      store.set('foo', 'bar');

      await store.load(input);

      expect(Array.from(store)).to.deep.equal(expected);
    });

    context('when input contains no property lines', () => {
      it('should read no properties', async() => {
        const input = new MockReadable(Buffer.from([
          '',
          '# foo'
        ].join('\n')));
        const expected = [];
        const store = new PropertiesStore();

        await store.load(input);

        expect(Array.from(store)).to.deep.equal(expected);
      });

      it('should emit "load" event but not any "change" events', async() => {
        const changeCallback = sinon.spy();
        const loadCallback = sinon.spy();
        const input = new MockReadable(Buffer.from([
          '',
          '# foo'
        ].join('\n')));
        const store = new PropertiesStore();

        store.on('change', changeCallback);
        store.on('load', loadCallback);

        await store.load(input);

        expect(changeCallback.callCount).to.equal(0);
        expect(loadCallback.callCount).to.equal(1);

        const loadCalls = loadCallback.getCalls();

        expect(loadCalls[0].args).to.deep.equal([
          {
            input,
            options: { encoding: 'latin1' },
            properties: store
          }
        ]);
      });
    });

    context('when input is empty', () => {
      it('should read no properties', async() => {
        const input = new MockReadable();
        const expected = [];
        const store = new PropertiesStore();

        await store.load(input);

        expect(Array.from(store)).to.deep.equal(expected);
      });
    });

    context('when input is TTY', () => {
      it('should read no properties', async() => {
        const input = new MockReadable(Buffer.from([
          '',
          '# foo',
          'foo=bar'
        ].join('\n')));
        input.isTTY = true;
        const expected = [];
        const store = new PropertiesStore();

        await store.load(input);

        expect(Array.from(store)).to.deep.equal(expected);
      });
    });

    context('when failed to read from input', () => {
      it('should throw an error', async() => {
        const expectedError = new Error('foo');
        const input = new MockReadable(null, expectedError);
        const expected = [];
        const store = new PropertiesStore();

        try {
          await store.load(input);
          // Should have thrown
          expect.fail();
        } catch (e) {
          expect(e).to.equal(expectedError);
        }

        expect(Array.from(store)).to.deep.equal(expected);
      });
    });

    context('when encoding option is not specified', () => {
      it('should read input using latin1 encoding', async() => {
        const input = new MockReadable(Buffer.from('foo¥bar=fu¥baz'));
        const expected = [
          [ Buffer.from('foo¥bar').toString('latin1'), Buffer.from('fu¥baz').toString('latin1') ]
        ];
        const store = new PropertiesStore();

        await store.load(input);

        expect(Array.from(store)).to.deep.equal(expected);
      });
    });

    context('when encoding option is specified', () => {
      it('should read input using encoding', async() => {
        const input = new MockReadable(Buffer.from('foo¥bar=fu¥baz'));
        const expected = [
          [ 'foo¥bar', 'fu¥baz' ]
        ];
        const store = new PropertiesStore();

        await store.load(input, { encoding: 'utf8' });

        expect(Array.from(store)).to.deep.equal(expected);
      });
    });
  });

  describe('#set', () => {
    context('when no property exists for key', () => {
      it('should set property value for key and return PropertiesStore', () => {
        const expected = [
          [ 'foo', 'bar' ]
        ];
        const store = new PropertiesStore();

        expect(store.set('foo', 'bar')).to.equal(store);

        expect(Array.from(store)).to.deep.equal(expected);
      });

      it('should emit "change" event but not "delete" event', () => {
        const changeCallback = sinon.spy();
        const deleteCallback = sinon.spy();
        const store = new PropertiesStore();

        store.on('change', changeCallback);
        store.on('delete', deleteCallback);

        expect(store.set('foo', 'bar')).to.equal(store);

        expect(changeCallback.callCount).to.equal(1);
        expect(deleteCallback.callCount).to.equal(0);

        const changeCalls = changeCallback.getCalls();

        expect(changeCalls[0].args).to.deep.equal([
          {
            key: 'foo',
            newValue: 'bar',
            oldValue: undefined,
            properties: store
          }
        ]);
      });

      context('and value is null', () => {
        it('should not remove any property and return PropertiesStore', () => {
          const store = new PropertiesStore();

          expect(store.set('foo', null)).to.equal(store);

          expect(Array.from(store)).to.deep.equal([]);
        });

        it('should not emit "change" or "delete" event', () => {
          const changeCallback = sinon.spy();
          const deleteCallback = sinon.spy();
          const store = new PropertiesStore();

          store.on('change', changeCallback);
          store.on('delete', deleteCallback);

          expect(store.set('foo', null)).to.equal(store);

          expect(changeCallback.callCount).to.equal(0);
          expect(deleteCallback.callCount).to.equal(0);
        });
      });
    });

    context('when property exists for key', () => {
      it('should set property value for key and return PropertiesStore', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const expected = [
          [ 'foo', 'quux' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store.set('foo', 'quux')).to.equal(store);

        expect(Array.from(store)).to.deep.equal(expected);
      });

      it('should emit "change" event but not "delete" event', () => {
        const changeCallback = sinon.spy();
        const deleteCallback = sinon.spy();
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        store.on('change', changeCallback);
        store.on('delete', deleteCallback);

        expect(store.set('foo', 'quux')).to.equal(store);

        expect(changeCallback.callCount).to.equal(1);
        expect(deleteCallback.callCount).to.equal(0);

        const changeCalls = changeCallback.getCalls();

        expect(changeCalls[0].args).to.deep.equal([
          {
            key: 'foo',
            newValue: 'quux',
            oldValue: 'bar',
            properties: store
          }
        ]);
      });

      context('and value is same as existing', () => {
        it('should not emit "change" or "delete" event', () => {
          const changeCallback = sinon.spy();
          const deleteCallback = sinon.spy();
          const store = new PropertiesStore();

          expect(store.set('foo', 'bar')).to.equal(store);

          store.on('change', changeCallback);
          store.on('delete', deleteCallback);

          expect(store.set('foo', 'bar')).to.equal(store);

          expect(changeCallback.callCount).to.equal(0);
          expect(deleteCallback.callCount).to.equal(0);
        });
      });

      context('and value is null', () => {
        it('should remove property for key and return PropertiesStore', () => {
          const properties = [
            [ 'foo', 'bar' ],
            [ 'fu', 'baz' ],
            [ 'fizz', 'buzz' ]
          ];
          const expected = [
            [ 'fu', 'baz' ],
            [ 'fizz', 'buzz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          expect(store.set('foo', null)).to.equal(store);

          expect(Array.from(store)).to.deep.equal(expected);
        });

        it('should emit "delete" event but not "change" event', () => {
          const changeCallback = sinon.spy();
          const deleteCallback = sinon.spy();
          const properties = [
            [ 'foo', 'bar' ],
            [ 'fu', 'baz' ],
            [ 'fizz', 'buzz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          store.on('change', changeCallback);
          store.on('delete', deleteCallback);

          expect(store.set('foo', null)).to.equal(store);

          expect(changeCallback.callCount).to.equal(0);
          expect(deleteCallback.callCount).to.equal(1);

          const deleteCalls = deleteCallback.getCalls();

          expect(deleteCalls[0].args).to.deep.equal([
            {
              key: 'foo',
              properties: store,
              value: 'bar'
            }
          ]);
        });
      });
    });

    context('when key is using different case', () => {
      it('should set property value for key and return PropertiesStore', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'FU', 'baz' ]
        ];
        const expected = [
          [ 'foo', 'bar' ],
          [ 'FU', 'baz' ],
          [ 'FOO', 'buzz' ],
          [ 'fu', 'quux' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store.set('FOO', 'buzz')).to.equal(store);
        expect(store.set('fu', 'quux')).to.equal(store);

        expect(Array.from(store)).to.deep.equal(expected);
      });

      it('should emit "change" event but not "delete" event', () => {
        const changeCallback = sinon.spy();
        const deleteCallback = sinon.spy();
        const properties = [
          [ 'foo', 'bar' ],
          [ 'FU', 'baz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        store.on('change', changeCallback);
        store.on('delete', deleteCallback);

        expect(store.set('FOO', 'buzz')).to.equal(store);
        expect(store.set('fu', 'quux')).to.equal(store);

        expect(changeCallback.callCount).to.equal(2);
        expect(deleteCallback.callCount).to.equal(0);

        const changeCalls = changeCallback.getCalls();

        expect(changeCalls[0].args).to.deep.equal([
          {
            key: 'FOO',
            newValue: 'buzz',
            oldValue: undefined,
            properties: store
          }
        ]);
        expect(changeCalls[1].args).to.deep.equal([
          {
            key: 'fu',
            newValue: 'quux',
            oldValue: undefined,
            properties: store
          }
        ]);
      });

      context('and value is null', () => {
        it('should not remove any property and return PropertiesStore', () => {
          const properties = [
            [ 'foo', 'bar' ],
            [ 'FU', 'baz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          expect(store.set('FOO', null)).to.equal(store);
          expect(store.set('fu', null)).to.equal(store);

          expect(Array.from(store)).to.deep.equal(properties);
        });

        it('should not emit "change" or "delete" event', () => {
          const changeCallback = sinon.spy();
          const deleteCallback = sinon.spy();
          const properties = [
            [ 'foo', 'bar' ],
            [ 'FU', 'baz' ]
          ];
          const store = new PropertiesStore();

          for (const [ key, value ] of properties) {
            store.set(key, value);
          }

          store.on('change', changeCallback);
          store.on('delete', deleteCallback);

          expect(store.set('FOO', null)).to.equal(store);
          expect(store.set('fu', null)).to.equal(store);

          expect(changeCallback.callCount).to.equal(0);
          expect(deleteCallback.callCount).to.equal(0);
        });
      });
    });

    context('when key is null', () => {
      it('should not change or remove any property and return PropertiesStore', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store.set(null, 'quxx')).to.equal(store);
        expect(store.set(null, null)).to.equal(store);

        expect(Array.from(store)).to.deep.equal(properties);
      });

      it('should not emit "change" or "delete" event', () => {
        const changeCallback = sinon.spy();
        const deleteCallback = sinon.spy();
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        store.on('change', changeCallback);
        store.on('delete', deleteCallback);

        expect(store.set(null, 'quxx')).to.equal(store);
        expect(store.set(null, null)).to.equal(store);

        expect(changeCallback.callCount).to.equal(0);
        expect(deleteCallback.callCount).to.equal(0);
      });
    });
  });

  describe('#store', () => {
    it('should write property lines to output', async() => {
      const output = new MockWritable();
      const expected = [
        'foo=bar',
        'fu=baz'
      ].reduce((memo, value) => `${memo}${value}${EOL}`, '');
      const store = new PropertiesStore();
      store.set('foo', 'bar');
      store.set('fu', 'baz');

      await store.store(output);

      expect(output.buffer.toString()).to.equal(expected);
    });

    it('should emit "store" event', async() => {
      const storeCallback = sinon.spy();
      const output = new MockWritable();
      const store = new PropertiesStore();
      store.set('foo', 'bar');
      store.set('fu', 'baz');

      store.on('store', storeCallback);

      await store.store(output);

      expect(storeCallback.callCount).to.equal(1);

      const storeCalls = storeCallback.getCalls();

      expect(storeCalls[0].args).to.deep.equal([
        {
          options: {
            encoding: 'latin1',
            escapeUnicode: true
          },
          output,
          properties: store
        }
      ]);
    });

    context('when no properties exist', () => {
      it('should write empty buffer to output', async() => {
        const output = new MockWritable();
        const expected = '';
        const store = new PropertiesStore();

        await store.store(output);

        expect(output.buffer.toString()).to.equal(expected);
      });

      it('should emit "store" event', async() => {
        const storeCallback = sinon.spy();
        const output = new MockWritable();
        const store = new PropertiesStore();

        store.on('store', storeCallback);

        await store.store(output);

        expect(storeCallback.callCount).to.equal(1);

        const storeCalls = storeCallback.getCalls();

        expect(storeCalls[0].args).to.deep.equal([
          {
            options: {
              encoding: 'latin1',
              escapeUnicode: true
            },
            output,
            properties: store
          }
        ]);
      });
    });

    context('when failed to write to output', () => {
      it('should throw an error', async() => {
        const expectedError = new Error('foo');
        const output = new MockWritable(null, expectedError);
        const expectedOutput = '';
        const store = new PropertiesStore();
        store.set('foo', 'bar');
        store.set('fu', 'baz');

        try {
          await store.store(output);
          // Should have thrown
          expect.fail();
        } catch (e) {
          expect(e).to.equal(expectedError);
        }

        expect(output.buffer.toString()).to.equal(expectedOutput);
      });
    });

    context('when encoding option is not specified', () => {
      it('should write output using latin1 encoding', async() => {
        const output = new MockWritable();
        const expected = `foo\\u00a5bar=fu\\u00a5baz${EOL}`;

        const store = new PropertiesStore();
        store.set('foo¥bar', 'fu¥baz');

        await store.store(output);

        expect(output.buffer.toString()).to.equal(expected);
      });
    });

    context('when encoding option is specified', () => {
      it('should write output using encoding', async() => {
        const output = new MockWritable();
        const expected = `foo\\u00a5bar=fu\\u00a5baz${EOL}`;

        const store = new PropertiesStore();
        store.set('foo¥bar', 'fu¥baz');

        await store.store(output, { encoding: 'ascii' });

        expect(output.buffer.toString()).to.equal(expected);
      });
    });

    context('when escapeUnicode option is disabled', () => {
      it('should write non-ASCII characters to output as-is', async() => {
        const output = new MockWritable();
        const expected = `foo¥bar=fu¥baz${EOL}`;

        const store = new PropertiesStore();
        store.set('foo¥bar', 'fu¥baz');

        await store.store(output, {
          encoding: 'utf8',
          escapeUnicode: false
        });

        expect(output.buffer.toString()).to.equal(expected);
      });
    });

    context('when escapeUnicode option is enabled', () => {
      it('should escape non-ASCII characters before being written to output', async() => {
        const output = new MockWritable();
        const expected = `foo\\u00a5bar=fu\\u00a5baz${EOL}`;

        const store = new PropertiesStore();
        store.set('foo¥bar', 'fu¥baz');

        await store.store(output, {
          encoding: 'utf8',
          escapeUnicode: true
        });

        expect(output.buffer.toString()).to.equal(expected);
      });
    });
  });

  describe('#values', () => {
    it('should return iterator for each property value', () => {
      const properties = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ],
        [ 'fizz', 'buzz' ]
      ];
      const expected = properties.map(([ key, value ]) => value);
      const store = new PropertiesStore();

      for (const [ key, value ] of properties) {
        store.set(key, value);
      }

      const iterator = store.values();

      expect(iterator.next().value).to.equal('bar');
      expect(iterator.next().value).to.equal('baz');
      expect(iterator.next().value).to.equal('buzz');
      expect(iterator.next().value).to.equal(undefined);

      expect(Array.from(store.values())).to.deep.equal(expected);
    });

    context('when no properties exist', () => {
      it('should return an empty iterator', () => {
        const store = new PropertiesStore();
        const iterator = store.values();

        expect(iterator.next().value).to.equal(undefined);

        expect(Array.from(store.values())).to.deep.equal([]);
      });
    });
  });

  describe('#[Symbol.iterator]', () => {
    it('should return iterator for each property key/value pair', () => {
      const properties = [
        [ 'foo', 'bar' ],
        [ 'fu', 'baz' ],
        [ 'fizz', 'buzz' ]
      ];
      const store = new PropertiesStore();

      for (const [ key, value ] of properties) {
        store.set(key, value);
      }

      const iterator = store[Symbol.iterator]();

      expect(iterator.next().value).to.deep.equal([ 'foo', 'bar' ]);
      expect(iterator.next().value).to.deep.equal([ 'fu', 'baz' ]);
      expect(iterator.next().value).to.deep.equal([ 'fizz', 'buzz' ]);
      expect(iterator.next().value).to.equal(undefined);

      expect(Array.from(store)).to.deep.equal(properties);
    });

    context('when no properties exist', () => {
      it('should return an empty iterator', () => {
        const store = new PropertiesStore();
        const iterator = store[Symbol.iterator]();

        expect(iterator.next().value).to.equal(undefined);

        expect(Array.from(store)).to.deep.equal([]);
      });
    });
  });

  describe('#size', () => {
    describe('(get)', () => {
      it('should return number of properties', () => {
        const properties = [
          [ 'foo', 'bar' ],
          [ 'fu', 'baz' ],
          [ 'fizz', 'buzz' ]
        ];
        const store = new PropertiesStore();

        for (const [ key, value ] of properties) {
          store.set(key, value);
        }

        expect(store).to.have.property('size', 3);
      });

      context('when no properties exist', () => {
        it('should return zero', () => {
          const store = new PropertiesStore();

          expect(store).to.have.property('size', 0);
        });
      });
    });

    describe('(set)', () => {
      it('should throw an error', () => {
        const store = new PropertiesStore();

        expect(() => {
          store.size = 123;
        }).to.throw(TypeError);
      });
    });
  });
});
