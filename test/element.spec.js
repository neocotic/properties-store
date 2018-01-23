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

const Element = require('../src/element');

describe('Element', () => {
  describe('.createBlank', () => {
    it('should create a Element instance with an empty source', () => {
      const element = Element.createBlank();

      expect(element.source).to.equal('');
    });
  });

  describe('.createComment', () => {
    it('should create a Element instance for specified comment', () => {
      const element = Element.createComment('foo');

      expect(element.source).to.equal('# foo');
    });

    it('should trim leading whitespace from comment', () => {
      const element = Element.createComment(' \tfoo\t ');

      expect(element.source).to.equal('# foo\t ');
    });

    context('when comment is blank', () => {
      it('should use just comment prefix', () => {
        const element = Element.createComment(' \t ');

        expect(element.source).to.equal('#');
      });
    });

    context('when comment is null', () => {
      it('should use just comment prefix', () => {
        const element = Element.createComment(null);

        expect(element.source).to.equal('#');
      });
    });

    context('when comment is omitted', () => {
      it('should use just comment prefix', () => {
        const element = Element.createComment();

        expect(element.source).to.equal('#');
      });
    });
  });

  describe('.createProperty', () => {
    it('should create a Element instance for specified property key and value', () => {
      const element = Element.createProperty('foo', 'bar');

      expect(element.source).to.equal('foo=bar');
      expect(element.key).to.equal('foo');
      expect(element.value).to.equal('bar');
    });

    it('should trim property key and value', () => {
      const element = Element.createProperty(' \tfoo\t ', ' \tbar\t ');

      expect(element.source).to.equal('foo=bar\t ');
      expect(element.key).to.equal('foo');
      expect(element.value).to.equal('bar\t ');
    });

    context('when value is null', () => {
      it('should use an empty string as property value', () => {
        const element = Element.createProperty('foo', null);

        expect(element.source).to.equal('foo=');
        expect(element.key).to.equal('foo');
        expect(element.value).to.equal('');
      });
    });

    context('when value is omitted', () => {
      it('should use an empty string as property value', () => {
        const element = Element.createProperty('foo');

        expect(element.source).to.equal('foo=');
        expect(element.key).to.equal('foo');
        expect(element.value).to.equal('');
      });
    });
  });

  it('should parse property information from source', () => {
    const element = new Element('foo=bar');

    expect(element.source).to.equal('foo=bar');
    expect(element.key).to.equal('foo');
    expect(element.value).to.equal('bar');
  });

  context('when source is blank', () => {
    it('should contain no property information', () => {
      const element = new Element(' \t ');

      expect(element.source).to.equal(' \t ');
      expect(element.key).to.equal(undefined);
      expect(element.value).to.equal(undefined);
    });
  });

  context('when source is null', () => {
    it('should contain no property information', () => {
      const element = new Element(null);

      expect(element.source).to.equal('');
      expect(element.key).to.equal(undefined);
      expect(element.value).to.equal(undefined);
    });
  });

  context('when source is omitted', () => {
    it('should contain no property information', () => {
      const element = new Element();

      expect(element.source).to.equal('');
      expect(element.key).to.equal(undefined);
      expect(element.value).to.equal(undefined);
    });
  });

  describe('#key', () => {
    context('(get)', () => {
      it('should return property key', () => {
        expect(new Element('foo')).to.have.property('key', 'foo');
        expect(new Element('foo=')).to.have.property('key', 'foo');
        expect(new Element('foo:')).to.have.property('key', 'foo');
        expect(new Element('foo=bar')).to.have.property('key', 'foo');
        expect(new Element('foo:bar')).to.have.property('key', 'foo');
        expect(new Element('foo bar')).to.have.property('key', 'foo');
        expect(new Element('foo \t bar')).to.have.property('key', 'foo');
      });

      it('should return trimmed property key', () => {
        expect(new Element(' \tfoo\t ')).to.have.property('key', 'foo');
        expect(new Element(' \tfoo\t = ')).to.have.property('key', 'foo');
        expect(new Element(' \tfoo\t : ')).to.have.property('key', 'foo');
        expect(new Element(' \tfoo\t = \tbar\t ')).to.have.property('key', 'foo');
        expect(new Element(' \tfoo\t : \tbar\t ')).to.have.property('key', 'foo');
        expect(new Element(' \tfoo \t bar\t ')).to.have.property('key', 'foo');
      });

      context('when element does not contain property information', () => {
        it('should return undefined', () => {
          expect(new Element()).to.have.property('key', undefined);
          expect(new Element('# foo')).to.have.property('key', undefined);
        });
      });
    });

    context('(set)', () => {
      it('should throw an error', () => {
        const element = new Element('foo=bar');

        expect(() => {
          element.key = 'fizz';
        }).to.throw(TypeError);
      });
    });
  });

  describe('#property', () => {
    context('(get)', () => {
      context('when element contains property information', () => {
        it('should return true', () => {
          expect(new Element('foo')).to.have.property('property', true);
          expect(new Element('foo=')).to.have.property('property', true);
          expect(new Element('foo:')).to.have.property('property', true);
          expect(new Element('foo=bar')).to.have.property('property', true);
          expect(new Element('foo:bar')).to.have.property('property', true);
          expect(new Element('foo bar')).to.have.property('property', true);
          expect(new Element('foo \t bar')).to.have.property('property', true);
          expect(new Element(' \tfoo\t ')).to.have.property('property', true);
          expect(new Element(' \tfoo\t = ')).to.have.property('property', true);
          expect(new Element(' \tfoo\t : ')).to.have.property('property', true);
          expect(new Element(' \tfoo\t = \tbar\t ')).to.have.property('property', true);
          expect(new Element(' \tfoo\t : \tbar\t ')).to.have.property('property', true);
          expect(new Element(' \tfoo bar\t ')).to.have.property('property', true);
          expect(new Element(' \tfoo \t bar\t ')).to.have.property('property', true);
        });
      });

      context('when element does not contain property information', () => {
        it('should return false', () => {
          expect(new Element('')).to.have.property('property', false);
          expect(new Element(' ')).to.have.property('property', false);
          expect(new Element(' \t ')).to.have.property('property', false);
          expect(new Element('#')).to.have.property('property', false);
          expect(new Element('# foo')).to.have.property('property', false);
          expect(new Element(' \t# foo\t ')).to.have.property('property', false);
          expect(new Element('!')).to.have.property('property', false);
          expect(new Element('! foo')).to.have.property('property', false);
          expect(new Element(' \t! foo\t ')).to.have.property('property', false);
        });
      });
    });

    context('(set)', () => {
      it('should throw an error', () => {
        const element = new Element('foo=bar');

        expect(() => {
          element.property = false;
        }).to.throw(TypeError);
      });
    });
  });

  describe('#source', () => {
    context('(get)', () => {
      it('should return source', () => {
        expect(new Element('')).to.have.property('source', '');
        expect(new Element(' \t ')).to.have.property('source', ' \t ');
        expect(new Element(' # foo ')).to.have.property('source', ' # foo ');
        expect(new Element(' ! foo ')).to.have.property('source', ' ! foo ');
        expect(new Element('foo')).to.have.property('source', 'foo');
        expect(new Element(' foo bar ')).to.have.property('source', ' foo bar ');
        expect(new Element('foo = bar ')).to.have.property('source', 'foo = bar ');
        expect(new Element(' foo:bar')).to.have.property('source', ' foo:bar');
      });
    });

    context('(set)', () => {
      it('should throw an error', () => {
        const element = new Element('foo=bar');

        expect(() => {
          element.source = '# foo';
        }).to.throw(TypeError);
      });
    });
  });

  describe('#value', () => {
    context('(get)', () => {
      it('should return property value', () => {
        expect(new Element('foo')).to.have.property('value', '');
        expect(new Element('foo=')).to.have.property('value', '');
        expect(new Element('foo:')).to.have.property('value', '');
        expect(new Element('foo=bar')).to.have.property('value', 'bar');
        expect(new Element('foo:bar')).to.have.property('value', 'bar');
        expect(new Element('foo bar')).to.have.property('value', 'bar');
        expect(new Element('foo \t bar')).to.have.property('value', 'bar');
      });

      it('should return trimmed property value', () => {
        expect(new Element(' \tfoo\t ')).to.have.property('value', '');
        expect(new Element(' \tfoo\t = ')).to.have.property('value', '');
        expect(new Element(' \tfoo\t : ')).to.have.property('value', '');
        expect(new Element(' \tfoo\t = \tbar\t ')).to.have.property('value', 'bar\t ');
        expect(new Element(' \tfoo\t : \tbar\t ')).to.have.property('value', 'bar\t ');
        expect(new Element(' \tfoo \t bar\t ')).to.have.property('value', 'bar\t ');
      });

      context('when element does not contain property information', () => {
        it('should return undefined', () => {
          expect(new Element()).to.have.property('value', undefined);
          expect(new Element('# foo')).to.have.property('value', undefined);
        });
      });
    });

    context('(set)', () => {
      it('should set property value', () => {
        let element = new Element('foo=bar');
        element.value = 'baz';

        expect(element.source).to.equal('foo=baz');
        expect(element.key).to.equal('foo');
        expect(element.value).to.equal('baz');

        element = new Element('foo');
        element.value = 'bar';

        expect(element.source).to.equal('foo=bar');
        expect(element.key).to.equal('foo');
        expect(element.value).to.equal('bar');
      });

      it('should retain structure of source', () => {
        let element = new Element(' \t foo \t = \t bar \t ');
        element.value = 'baz';

        expect(element.source).to.equal(' \t foo \t = \t baz');
        expect(element.key).to.equal('foo');
        expect(element.value).to.equal('baz');

        element = new Element(' \t foo \t : \t bar \t ');
        element.value = 'baz';

        expect(element.source).to.equal(' \t foo \t : \t baz');
        expect(element.key).to.equal('foo');
        expect(element.value).to.equal('baz');

        element = new Element(' \t foo \t bar \t ');
        element.value = 'baz';

        expect(element.source).to.equal(' \t foo \t baz');
        expect(element.key).to.equal('foo');
        expect(element.value).to.equal('baz');

        element = new Element(' \t foo \t ');
        element.value = 'bar';

        expect(element.source).to.equal(' \t foo \t bar');
        expect(element.key).to.equal('foo');
        expect(element.value).to.equal('bar');
      });

      context('when value is same', () => {
        it('should remain unchanged', () => {
          const element = new Element('foo= \tbar\t ');
          element.value = 'bar\t ';

          expect(element.source).to.equal('foo= \tbar\t ');
          expect(element.key).to.equal('foo');
          expect(element.value).to.equal('bar\t ');
        });
      });

      context('when value is blank', () => {
        it('should set empty property value', () => {
          const element = new Element('foo=bar');
          element.value = ' \t ';

          expect(element.source).to.equal('foo=');
          expect(element.key).to.equal('foo');
          expect(element.value).to.equal('');
        });
      });

      context('when value is null', () => {
        it('should set empty property value', () => {
          const element = new Element('foo=bar');
          element.value = null;

          expect(element.source).to.equal('foo=');
          expect(element.key).to.equal('foo');
          expect(element.value).to.equal('');
        });
      });

      context('when element does not contain property information', () => {
        it('should do nothing', () => {
          let element = new Element();
          element.value = 'fizz';

          expect(element.source).to.equal('');
          expect(element.key).to.equal(undefined);
          expect(element.value).to.equal(undefined);

          element = new Element('# foo');
          element.value = 'fizz';

          expect(element.source).to.equal('# foo');
          expect(element.key).to.equal(undefined);
          expect(element.value).to.equal(undefined);
        });
      });
    });
  });
});
