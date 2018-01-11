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
const sinon = require('sinon');

const Doc = require('../src/doc');
const Line = require('../src/line');

describe('Doc', () => {
  let doc;

  beforeEach(() => {
    doc = new Doc();
  });

  describe('.parse', () => {
    it('should invoke callback with each line parsed from source', () => {
      const callback = sinon.stub();
      const source = '\n# foo\r\nfoo=bar';

      Doc.parse(source, callback);

      expect(callback.callCount).to.equal(3);

      const calls = callback.getCalls();

      expect(calls[0].args).to.have.lengthOf(2);
      expect(calls[0].args[0]).to.have.property('source', '');
      expect(calls[0].args[1]).to.equal(0);
      expect(calls[0].thisValue).to.equal(undefined);

      expect(calls[1].args).to.have.lengthOf(2);
      expect(calls[1].args[0]).to.have.property('source', '# foo');
      expect(calls[1].args[1]).to.equal(1);
      expect(calls[1].thisValue).to.equal(undefined);

      expect(calls[2].args).to.have.lengthOf(2);
      expect(calls[2].args[0]).to.have.property('source', 'foo=bar');
      expect(calls[2].args[1]).to.equal(2);
      expect(calls[2].thisValue).to.equal(undefined);
    });

    context('when source is empty', () => {
      it('should invoke callback once with a blank line', () => {
        const callback = sinon.stub();
        const source = '';

        Doc.parse(source, callback);

        expect(callback.callCount).to.equal(1);

        const calls = callback.getCalls();

        expect(calls[0].args).to.have.lengthOf(2);
        expect(calls[0].args[0]).to.have.property('source', '');
        expect(calls[0].args[1]).to.equal(0);
        expect(calls[0].thisValue).to.equal(undefined);
      });
    });

    context('when source is null', () => {
      it('should not invoke callback', () => {
        const callback = sinon.stub();

        Doc.parse(null, callback);

        expect(callback.callCount).to.equal(0);
      });
    });

    context('when thisArg is specified', () => {
      it('should invoke callback using thisArg as "this"', () => {
        const callback = sinon.stub();
        const source = '\n# foo\r\nfoo=bar';
        const thisArg = {};

        Doc.parse(source, callback, thisArg);

        expect(callback.callCount).to.equal(3);

        const calls = callback.getCalls();

        expect(calls[0].args).to.have.lengthOf(2);
        expect(calls[0].args[0]).to.have.property('source', '');
        expect(calls[0].args[1]).to.equal(0);
        expect(calls[0].thisValue).to.equal(thisArg);

        expect(calls[1].args).to.have.lengthOf(2);
        expect(calls[1].args[0]).to.have.property('source', '# foo');
        expect(calls[1].args[1]).to.equal(1);
        expect(calls[1].thisValue).to.equal(thisArg);

        expect(calls[2].args).to.have.lengthOf(2);
        expect(calls[2].args[0]).to.have.property('source', 'foo=bar');
        expect(calls[2].args[1]).to.equal(2);
        expect(calls[2].thisValue).to.equal(thisArg);
      });
    });
  });

  describe('#add', () => {
    it('should add line and return Doc', () => {
      const lines = [
        Line.createBlank(),
        Line.createComment('foo'),
        Line.createProperty('foo', 'bar')
      ];

      for (const line of lines) {
        expect(doc.add(line)).to.equal(doc);
      }

      expect(Array.from(doc)).to.deep.equal(lines);
    });

    context('when line is null', () => {
      it('should not add anything and return Doc', () => {
        expect(doc.add(null)).to.equal(doc);

        expect(Array.from(doc)).to.deep.equal([]);
      });
    });
  });

  describe('#clear', () => {
    it('should remove all lines', () => {
      const lines = [
        Line.createBlank(),
        Line.createComment('foo'),
        Line.createProperty('foo', 'bar')
      ];

      for (const line of lines) {
        doc.add(line);
      }

      doc.clear();

      expect(Array.from(doc)).to.deep.equal([]);
    });
  });

  describe('#delete', () => {
    it('should remove all property lines for key and return true', () => {
      const lines = [
        Line.createBlank(),
        Line.createComment('foo'),
        Line.createProperty('foo', 'bar'),
        Line.createBlank(),
        Line.createProperty('foo', 'baz'),
        Line.createProperty('foo', 'buzz'),
        Line.createBlank(),
        Line.createProperty('fu', 'bar')
      ];
      const expected = lines.filter((line, index) => {
        return !line.property || line.key !== 'foo';
      });

      for (const line of lines) {
        doc.add(line);
      }

      expect(doc.delete('foo')).to.equal(true);

      expect(Array.from(doc)).to.deep.equal(expected);
    });

    context('when no property lines exist for key', () => {
      it('should not remove any lines and return false', () => {
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar'),
          Line.createBlank(),
          Line.createProperty('fu', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.delete('fizz')).to.equal(false);

        expect(Array.from(doc)).to.deep.equal(lines);
      });
    });

    context('when key is using different case', () => {
      it('should not remove any lines and return false', () => {
        const lines = [
          Line.createProperty('foo', 'bar'),
          Line.createProperty('FU', 'baz')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.delete('FOO')).to.equal(false);
        expect(doc.delete('fu')).to.equal(false);

        expect(Array.from(doc)).to.deep.equal(lines);
      });
    });

    context('when key is null', () => {
      it('should not remove any lines and return false', () => {
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.delete(null)).to.equal(false);

        expect(Array.from(doc)).to.deep.equal(lines);
      });
    });
  });

  describe('#forEach', () => {
    it('should invoke callback with each line', () => {
      const callback = sinon.stub();
      const lines = [
        Line.createBlank(),
        Line.createComment('foo'),
        Line.createProperty('foo', 'bar')
      ];

      for (const line of lines) {
        doc.add(line);
      }

      doc.forEach(callback);

      expect(callback.callCount).to.equal(3);

      const calls = callback.getCalls();

      expect(calls[0].args).to.deep.equal([ lines[0], 0, doc ]);
      expect(calls[0].thisValue).to.equal(undefined);

      expect(calls[1].args).to.deep.equal([ lines[1], 1, doc ]);
      expect(calls[1].thisValue).to.equal(undefined);

      expect(calls[2].args).to.deep.equal([ lines[2], 2, doc ]);
      expect(calls[2].thisValue).to.equal(undefined);
    });

    context('when no lines exist', () => {
      it('should not invoke callback', () => {
        const callback = sinon.stub();

        doc.forEach(callback);

        expect(callback.callCount).to.equal(0);
      });
    });

    context('when thisArg is specified', () => {
      it('should invoke callback using thisArg as "this"', () => {
        const callback = sinon.stub();
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar')
        ];
        const thisArg = {};

        for (const line of lines) {
          doc.add(line);
        }

        doc.forEach(callback, thisArg);

        expect(callback.callCount).to.equal(3);

        const calls = callback.getCalls();

        expect(calls[0].args).to.deep.equal([ lines[0], 0, doc ]);
        expect(calls[0].thisValue).to.equal(thisArg);

        expect(calls[1].args).to.deep.equal([ lines[1], 1, doc ]);
        expect(calls[1].thisValue).to.equal(thisArg);

        expect(calls[2].args).to.deep.equal([ lines[2], 2, doc ]);
        expect(calls[2].thisValue).to.equal(thisArg);
      });
    });
  });

  describe('#get', () => {
    context('when multiple property lines exist for key', () => {
      it('should return last property line to match key', () => {
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar'),
          Line.createBlank(),
          Line.createProperty('foo', 'baz'),
          Line.createProperty('foo', 'buzz'),
          Line.createBlank(),
          Line.createProperty('fu', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.get('foo')).to.equal(lines[5]);
      });
    });

    context('when single property line exists for key', () => {
      it('should return property line that matches key', () => {
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar'),
          Line.createBlank(),
          Line.createProperty('fu', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.get('foo')).to.equal(lines[2]);
      });
    });

    context('when no property lines exist for key', () => {
      it('should return undefined', () => {
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.get('fu')).to.equal(undefined);
      });
    });

    context('when key is using different case', () => {
      it('should return undefined', () => {
        const lines = [
          Line.createProperty('foo', 'bar'),
          Line.createProperty('FU', 'baz')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.get('FOO')).to.equal(undefined);
        expect(doc.get('fu')).to.equal(undefined);
      });
    });

    context('when key is null', () => {
      it('should return undefined', () => {
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.get(null)).to.equal(undefined);
      });
    });
  });

  describe('#has', () => {
    context('when multiple property lines exist for key', () => {
      it('should return true', () => {
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar'),
          Line.createBlank(),
          Line.createProperty('foo', 'baz'),
          Line.createProperty('foo', 'buzz'),
          Line.createBlank(),
          Line.createProperty('fu', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.has('foo')).to.equal(true);
      });
    });

    context('when single property line exists for key', () => {
      it('should return true', () => {
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar'),
          Line.createBlank(),
          Line.createProperty('fu', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.has('foo')).to.equal(true);
      });
    });

    context('when no property lines exist for key', () => {
      it('should return false', () => {
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.has('fu')).to.equal(false);
      });
    });

    context('when key is using different case', () => {
      it('should return false', () => {
        const lines = [
          Line.createProperty('foo', 'bar'),
          Line.createProperty('FU', 'baz')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.has('FOO')).to.equal(false);
        expect(doc.has('fu')).to.equal(false);
      });
    });

    context('when key is null', () => {
      it('should return false', () => {
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.has(null)).to.equal(false);
      });
    });
  });

  describe('#join', () => {
    it('should join all lines using a comma separator', () => {
      const expected = ',# foo,foo=bar,,foo=baz,foo=buzz,,fu=bar';
      const lines = [
        Line.createBlank(),
        Line.createComment('foo'),
        Line.createProperty('foo', 'bar'),
        Line.createBlank(),
        Line.createProperty('foo', 'baz'),
        Line.createProperty('foo', 'buzz'),
        Line.createBlank(),
        Line.createProperty('fu', 'bar')
      ];

      for (const line of lines) {
        doc.add(line);
      }

      expect(doc.join()).to.equal(expected);
    });

    context('when separator is specified', () => {
      it('should join all lines using separator', () => {
        const expected = '\n# foo\nfoo=bar\n\nfoo=baz\nfoo=buzz\n\nfu=bar';
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar'),
          Line.createBlank(),
          Line.createProperty('foo', 'baz'),
          Line.createProperty('foo', 'buzz'),
          Line.createBlank(),
          Line.createProperty('fu', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc.join('\n')).to.equal(expected);
      });
    });

    context('when no lines exist', () => {
      it('should return an empty string', () => {
        expect(doc.join()).to.equal('');
      });
    });
  });

  describe('#[Symbol.iterator]', () => {
    it('should return iterator for each line', () => {
      const lines = [
        Line.createBlank(),
        Line.createComment('foo'),
        Line.createProperty('foo', 'bar')
      ];

      for (const line of lines) {
        doc.add(line);
      }

      const iterator = doc[Symbol.iterator]();

      expect(iterator.next().value).to.equal(lines[0]);
      expect(iterator.next().value).to.equal(lines[1]);
      expect(iterator.next().value).to.equal(lines[2]);
      expect(iterator.next().value).to.equal(undefined);

      expect(Array.from(doc)).to.deep.equal(lines);
    });

    context('when no lines exist', () => {
      it('should return an empty iterator', () => {
        const iterator = doc[Symbol.iterator]();

        expect(iterator.next().value).to.equal(undefined);

        expect(Array.from(doc)).to.deep.equal([]);
      });
    });
  });

  describe('#size', () => {
    describe('(get)', () => {
      it('should return number of lines', () => {
        const lines = [
          Line.createBlank(),
          Line.createComment('foo'),
          Line.createProperty('foo', 'bar')
        ];

        for (const line of lines) {
          doc.add(line);
        }

        expect(doc).to.have.property('size', 3);
      });

      context('when no lines exist', () => {
        it('should return zero', () => {
          expect(doc).to.have.property('size', 0);
        });
      });
    });

    describe('(set)', () => {
      it('should throw an error', () => {
        expect(() => {
          doc.size = 123;
        }).to.throw(TypeError);
      });
    });
  });
});
