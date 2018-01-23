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

const Document = require('../src/document');
const Element = require('../src/element');

describe('Document', () => {
  let document;

  beforeEach(() => {
    document = new Document();
  });

  describe('.parse', () => {
    it('should invoke callback with each element parsed from source', () => {
      const callback = sinon.stub();
      const source = '\n# foo\r\nfoo=bar';

      Document.parse(source, callback);

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
      it('should invoke callback once with a blank element', () => {
        const callback = sinon.stub();
        const source = '';

        Document.parse(source, callback);

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

        Document.parse(null, callback);

        expect(callback.callCount).to.equal(0);
      });
    });

    context('when thisArg is specified', () => {
      it('should invoke callback using thisArg as "this"', () => {
        const callback = sinon.stub();
        const source = '\n# foo\r\nfoo=bar';
        const thisArg = {};

        Document.parse(source, callback, thisArg);

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
    it('should add element and return Document', () => {
      const elements = [
        Element.createBlank(),
        Element.createComment('foo'),
        Element.createProperty('foo', 'bar')
      ];

      for (const element of elements) {
        expect(document.add(element)).to.equal(document);
      }

      expect(Array.from(document)).to.deep.equal(elements);
    });

    context('when element is null', () => {
      it('should not add anything and return Document', () => {
        expect(document.add(null)).to.equal(document);

        expect(Array.from(document)).to.deep.equal([]);
      });
    });
  });

  describe('#clear', () => {
    it('should remove all elements', () => {
      const elements = [
        Element.createBlank(),
        Element.createComment('foo'),
        Element.createProperty('foo', 'bar')
      ];

      for (const element of elements) {
        document.add(element);
      }

      document.clear();

      expect(Array.from(document)).to.deep.equal([]);
    });
  });

  describe('#delete', () => {
    it('should remove all property elements for key and return true', () => {
      const elements = [
        Element.createBlank(),
        Element.createComment('foo'),
        Element.createProperty('foo', 'bar'),
        Element.createBlank(),
        Element.createProperty('foo', 'baz'),
        Element.createProperty('foo', 'buzz'),
        Element.createBlank(),
        Element.createProperty('fu', 'bar')
      ];
      const expected = elements.filter((element, index) => {
        return !element.property || element.key !== 'foo';
      });

      for (const element of elements) {
        document.add(element);
      }

      expect(document.delete('foo')).to.equal(true);

      expect(Array.from(document)).to.deep.equal(expected);
    });

    context('when no property elements exist for key', () => {
      it('should not remove any elements and return false', () => {
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar'),
          Element.createBlank(),
          Element.createProperty('fu', 'bar')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.delete('fizz')).to.equal(false);

        expect(Array.from(document)).to.deep.equal(elements);
      });
    });

    context('when key is using different case', () => {
      it('should not remove any elements and return false', () => {
        const elements = [
          Element.createProperty('foo', 'bar'),
          Element.createProperty('FU', 'baz')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.delete('FOO')).to.equal(false);
        expect(document.delete('fu')).to.equal(false);

        expect(Array.from(document)).to.deep.equal(elements);
      });
    });

    context('when key is null', () => {
      it('should not remove any elements and return false', () => {
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.delete(null)).to.equal(false);

        expect(Array.from(document)).to.deep.equal(elements);
      });
    });
  });

  describe('#forEach', () => {
    it('should invoke callback with each element', () => {
      const callback = sinon.stub();
      const elements = [
        Element.createBlank(),
        Element.createComment('foo'),
        Element.createProperty('foo', 'bar')
      ];

      for (const element of elements) {
        document.add(element);
      }

      document.forEach(callback);

      expect(callback.callCount).to.equal(3);

      const calls = callback.getCalls();

      expect(calls[0].args).to.deep.equal([ elements[0], 0, document ]);
      expect(calls[0].thisValue).to.equal(undefined);

      expect(calls[1].args).to.deep.equal([ elements[1], 1, document ]);
      expect(calls[1].thisValue).to.equal(undefined);

      expect(calls[2].args).to.deep.equal([ elements[2], 2, document ]);
      expect(calls[2].thisValue).to.equal(undefined);
    });

    context('when no elements exist', () => {
      it('should not invoke callback', () => {
        const callback = sinon.stub();

        document.forEach(callback);

        expect(callback.callCount).to.equal(0);
      });
    });

    context('when thisArg is specified', () => {
      it('should invoke callback using thisArg as "this"', () => {
        const callback = sinon.stub();
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar')
        ];
        const thisArg = {};

        for (const element of elements) {
          document.add(element);
        }

        document.forEach(callback, thisArg);

        expect(callback.callCount).to.equal(3);

        const calls = callback.getCalls();

        expect(calls[0].args).to.deep.equal([ elements[0], 0, document ]);
        expect(calls[0].thisValue).to.equal(thisArg);

        expect(calls[1].args).to.deep.equal([ elements[1], 1, document ]);
        expect(calls[1].thisValue).to.equal(thisArg);

        expect(calls[2].args).to.deep.equal([ elements[2], 2, document ]);
        expect(calls[2].thisValue).to.equal(thisArg);
      });
    });
  });

  describe('#get', () => {
    context('when multiple property elements exist for key', () => {
      it('should return last property element to match key', () => {
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar'),
          Element.createBlank(),
          Element.createProperty('foo', 'baz'),
          Element.createProperty('foo', 'buzz'),
          Element.createBlank(),
          Element.createProperty('fu', 'bar')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.get('foo')).to.equal(elements[5]);
      });
    });

    context('when single property element exists for key', () => {
      it('should return property element that matches key', () => {
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar'),
          Element.createBlank(),
          Element.createProperty('fu', 'bar')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.get('foo')).to.equal(elements[2]);
      });
    });

    context('when no property elements exist for key', () => {
      it('should return undefined', () => {
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.get('fu')).to.equal(undefined);
      });
    });

    context('when key is using different case', () => {
      it('should return undefined', () => {
        const elements = [
          Element.createProperty('foo', 'bar'),
          Element.createProperty('FU', 'baz')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.get('FOO')).to.equal(undefined);
        expect(document.get('fu')).to.equal(undefined);
      });
    });

    context('when key is null', () => {
      it('should return undefined', () => {
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.get(null)).to.equal(undefined);
      });
    });
  });

  describe('#has', () => {
    context('when multiple property elements exist for key', () => {
      it('should return true', () => {
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar'),
          Element.createBlank(),
          Element.createProperty('foo', 'baz'),
          Element.createProperty('foo', 'buzz'),
          Element.createBlank(),
          Element.createProperty('fu', 'bar')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.has('foo')).to.equal(true);
      });
    });

    context('when single property element exists for key', () => {
      it('should return true', () => {
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar'),
          Element.createBlank(),
          Element.createProperty('fu', 'bar')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.has('foo')).to.equal(true);
      });
    });

    context('when no property elements exist for key', () => {
      it('should return false', () => {
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.has('fu')).to.equal(false);
      });
    });

    context('when key is using different case', () => {
      it('should return false', () => {
        const elements = [
          Element.createProperty('foo', 'bar'),
          Element.createProperty('FU', 'baz')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.has('FOO')).to.equal(false);
        expect(document.has('fu')).to.equal(false);
      });
    });

    context('when key is null', () => {
      it('should return false', () => {
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document.has(null)).to.equal(false);
      });
    });
  });

  describe('#[Symbol.iterator]', () => {
    it('should return iterator for each element', () => {
      const elements = [
        Element.createBlank(),
        Element.createComment('foo'),
        Element.createProperty('foo', 'bar')
      ];

      for (const element of elements) {
        document.add(element);
      }

      const iterator = document[Symbol.iterator]();

      expect(iterator.next().value).to.equal(elements[0]);
      expect(iterator.next().value).to.equal(elements[1]);
      expect(iterator.next().value).to.equal(elements[2]);
      expect(iterator.next().value).to.equal(undefined);

      expect(Array.from(document)).to.deep.equal(elements);
    });

    context('when no elements exist', () => {
      it('should return an empty iterator', () => {
        const iterator = document[Symbol.iterator]();

        expect(iterator.next().value).to.equal(undefined);

        expect(Array.from(document)).to.deep.equal([]);
      });
    });
  });

  describe('#size', () => {
    describe('(get)', () => {
      it('should return number of elements', () => {
        const elements = [
          Element.createBlank(),
          Element.createComment('foo'),
          Element.createProperty('foo', 'bar')
        ];

        for (const element of elements) {
          document.add(element);
        }

        expect(document).to.have.property('size', 3);
      });

      context('when no elements exist', () => {
        it('should return zero', () => {
          expect(document).to.have.property('size', 0);
        });
      });
    });

    describe('(set)', () => {
      it('should throw an error', () => {
        expect(() => {
          document.size = 123;
        }).to.throw(TypeError);
      });
    });
  });
});
