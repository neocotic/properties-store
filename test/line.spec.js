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

const Line = require('../src/line');

describe('Line', () => {
  describe('.createBlank', () => {
    it('should create a Line instance with an empty source', () => {
      const line = Line.createBlank();

      expect(line.source).to.equal('');
    });
  });

  describe('.createComment', () => {
    it('should create a Line instance for specified comment', () => {
      const line = Line.createComment('foo');

      expect(line.source).to.equal('# foo');
    });

    it('should trim leading whitespace from comment', () => {
      const line = Line.createComment(' \tfoo\t ');

      expect(line.source).to.equal('# foo\t ');
    });

    context('when comment is blank', () => {
      it('should use just comment prefix', () => {
        const line = Line.createComment(' \t ');

        expect(line.source).to.equal('#');
      });
    });

    context('when comment is null', () => {
      it('should use just comment prefix', () => {
        const line = Line.createComment(null);

        expect(line.source).to.equal('#');
      });
    });

    context('when comment is omitted', () => {
      it('should use just comment prefix', () => {
        const line = Line.createComment();

        expect(line.source).to.equal('#');
      });
    });
  });

  describe('.createProperty', () => {
    it('should create a Line instance for specified property key and value', () => {
      const line = Line.createProperty('foo', 'bar');

      expect(line.source).to.equal('foo=bar');
      expect(line.key).to.equal('foo');
      expect(line.value).to.equal('bar');
    });

    it('should trim property key and value', () => {
      const line = Line.createProperty(' \tfoo\t ', ' \tbar\t ');

      expect(line.source).to.equal('foo=bar\t ');
      expect(line.key).to.equal('foo');
      expect(line.value).to.equal('bar\t ');
    });

    context('when value is null', () => {
      it('should use an empty string as property value', () => {
        const line = Line.createProperty('foo', null);

        expect(line.source).to.equal('foo=');
        expect(line.key).to.equal('foo');
        expect(line.value).to.equal('');
      });
    });

    context('when value is omitted', () => {
      it('should use an empty string as property value', () => {
        const line = Line.createProperty('foo');

        expect(line.source).to.equal('foo=');
        expect(line.key).to.equal('foo');
        expect(line.value).to.equal('');
      });
    });
  });

  it('should parse property information from source', () => {
    const line = new Line('foo=bar');

    expect(line.source).to.equal('foo=bar');
    expect(line.key).to.equal('foo');
    expect(line.value).to.equal('bar');
  });

  context('when source is blank', () => {
    it('should contain no property information', () => {
      const line = new Line(' \t ');

      expect(line.source).to.equal(' \t ');
      expect(line.key).to.equal(undefined);
      expect(line.value).to.equal(undefined);
    });
  });

  context('when source is null', () => {
    it('should contain no property information', () => {
      const line = new Line(null);

      expect(line.source).to.equal('');
      expect(line.key).to.equal(undefined);
      expect(line.value).to.equal(undefined);
    });
  });

  context('when source is omitted', () => {
    it('should contain no property information', () => {
      const line = new Line();

      expect(line.source).to.equal('');
      expect(line.key).to.equal(undefined);
      expect(line.value).to.equal(undefined);
    });
  });

  describe('#key', () => {
    context('(get)', () => {
      it('should return property key', () => {
        expect(new Line('foo')).to.have.property('key', 'foo');
        expect(new Line('foo=')).to.have.property('key', 'foo');
        expect(new Line('foo:')).to.have.property('key', 'foo');
        expect(new Line('foo=bar')).to.have.property('key', 'foo');
        expect(new Line('foo:bar')).to.have.property('key', 'foo');
        expect(new Line('foo bar')).to.have.property('key', 'foo');
        expect(new Line('foo \t bar')).to.have.property('key', 'foo');
      });

      it('should return trimmed property key', () => {
        expect(new Line(' \tfoo\t ')).to.have.property('key', 'foo');
        expect(new Line(' \tfoo\t = ')).to.have.property('key', 'foo');
        expect(new Line(' \tfoo\t : ')).to.have.property('key', 'foo');
        expect(new Line(' \tfoo\t = \tbar\t ')).to.have.property('key', 'foo');
        expect(new Line(' \tfoo\t : \tbar\t ')).to.have.property('key', 'foo');
        expect(new Line(' \tfoo \t bar\t ')).to.have.property('key', 'foo');
      });

      context('when line does not contain property information', () => {
        it('should return undefined', () => {
          expect(new Line()).to.have.property('key', undefined);
          expect(new Line('# foo')).to.have.property('key', undefined);
        });
      });
    });

    context('(set)', () => {
      it('should throw an error', () => {
        const line = new Line('foo=bar');

        expect(() => {
          line.key = 'fizz';
        }).to.throw(TypeError);
      });
    });
  });

  describe('#property', () => {
    context('(get)', () => {
      context('when line contains property information', () => {
        it('should return true', () => {
          expect(new Line('foo')).to.have.property('property', true);
          expect(new Line('foo=')).to.have.property('property', true);
          expect(new Line('foo:')).to.have.property('property', true);
          expect(new Line('foo=bar')).to.have.property('property', true);
          expect(new Line('foo:bar')).to.have.property('property', true);
          expect(new Line('foo bar')).to.have.property('property', true);
          expect(new Line('foo \t bar')).to.have.property('property', true);
          expect(new Line(' \tfoo\t ')).to.have.property('property', true);
          expect(new Line(' \tfoo\t = ')).to.have.property('property', true);
          expect(new Line(' \tfoo\t : ')).to.have.property('property', true);
          expect(new Line(' \tfoo\t = \tbar\t ')).to.have.property('property', true);
          expect(new Line(' \tfoo\t : \tbar\t ')).to.have.property('property', true);
          expect(new Line(' \tfoo bar\t ')).to.have.property('property', true);
          expect(new Line(' \tfoo \t bar\t ')).to.have.property('property', true);
        });
      });

      context('when line does not contain property information', () => {
        it('should return false', () => {
          expect(new Line('')).to.have.property('property', false);
          expect(new Line(' ')).to.have.property('property', false);
          expect(new Line(' \t ')).to.have.property('property', false);
          expect(new Line('#')).to.have.property('property', false);
          expect(new Line('# foo')).to.have.property('property', false);
          expect(new Line(' \t# foo\t ')).to.have.property('property', false);
          expect(new Line('!')).to.have.property('property', false);
          expect(new Line('! foo')).to.have.property('property', false);
          expect(new Line(' \t! foo\t ')).to.have.property('property', false);
        });
      });
    });

    context('(set)', () => {
      it('should throw an error', () => {
        const line = new Line('foo=bar');

        expect(() => {
          line.property = false;
        }).to.throw(TypeError);
      });
    });
  });

  describe('#source', () => {
    context('(get)', () => {
      it('should return source', () => {
        expect(new Line('')).to.have.property('source', '');
        expect(new Line(' \t ')).to.have.property('source', ' \t ');
        expect(new Line(' # foo ')).to.have.property('source', ' # foo ');
        expect(new Line(' ! foo ')).to.have.property('source', ' ! foo ');
        expect(new Line('foo')).to.have.property('source', 'foo');
        expect(new Line(' foo bar ')).to.have.property('source', ' foo bar ');
        expect(new Line('foo = bar ')).to.have.property('source', 'foo = bar ');
        expect(new Line(' foo:bar')).to.have.property('source', ' foo:bar');
      });
    });

    context('(set)', () => {
      it('should throw an error', () => {
        const line = new Line('foo=bar');

        expect(() => {
          line.source = '# foo';
        }).to.throw(TypeError);
      });
    });
  });

  describe('#value', () => {
    context('(get)', () => {
      it('should return property value', () => {
        expect(new Line('foo')).to.have.property('value', '');
        expect(new Line('foo=')).to.have.property('value', '');
        expect(new Line('foo:')).to.have.property('value', '');
        expect(new Line('foo=bar')).to.have.property('value', 'bar');
        expect(new Line('foo:bar')).to.have.property('value', 'bar');
        expect(new Line('foo bar')).to.have.property('value', 'bar');
        expect(new Line('foo \t bar')).to.have.property('value', 'bar');
      });

      it('should return trimmed property value', () => {
        expect(new Line(' \tfoo\t ')).to.have.property('value', '');
        expect(new Line(' \tfoo\t = ')).to.have.property('value', '');
        expect(new Line(' \tfoo\t : ')).to.have.property('value', '');
        expect(new Line(' \tfoo\t = \tbar\t ')).to.have.property('value', 'bar\t ');
        expect(new Line(' \tfoo\t : \tbar\t ')).to.have.property('value', 'bar\t ');
        expect(new Line(' \tfoo \t bar\t ')).to.have.property('value', 'bar\t ');
      });

      context('when line does not contain property information', () => {
        it('should return undefined', () => {
          expect(new Line()).to.have.property('value', undefined);
          expect(new Line('# foo')).to.have.property('value', undefined);
        });
      });
    });

    context('(set)', () => {
      it('should set property value', () => {
        let line = new Line('foo=bar');
        line.value = 'baz';

        expect(line.source).to.equal('foo=baz');
        expect(line.key).to.equal('foo');
        expect(line.value).to.equal('baz');

        line = new Line('foo');
        line.value = 'bar';

        expect(line.source).to.equal('foo=bar');
        expect(line.key).to.equal('foo');
        expect(line.value).to.equal('bar');
      });

      it('should retain structure of source', () => {
        let line = new Line(' \t foo \t = \t bar \t ');
        line.value = 'baz';

        expect(line.source).to.equal(' \t foo \t = \t baz');
        expect(line.key).to.equal('foo');
        expect(line.value).to.equal('baz');

        line = new Line(' \t foo \t : \t bar \t ');
        line.value = 'baz';

        expect(line.source).to.equal(' \t foo \t : \t baz');
        expect(line.key).to.equal('foo');
        expect(line.value).to.equal('baz');

        line = new Line(' \t foo \t bar \t ');
        line.value = 'baz';

        expect(line.source).to.equal(' \t foo \t baz');
        expect(line.key).to.equal('foo');
        expect(line.value).to.equal('baz');

        line = new Line(' \t foo \t ');
        line.value = 'bar';

        expect(line.source).to.equal(' \t foo \t bar');
        expect(line.key).to.equal('foo');
        expect(line.value).to.equal('bar');
      });

      context('when value is same', () => {
        it('should remain unchanged', () => {
          const line = new Line('foo= \tbar\t ');
          line.value = 'bar\t ';

          expect(line.source).to.equal('foo= \tbar\t ');
          expect(line.key).to.equal('foo');
          expect(line.value).to.equal('bar\t ');
        });
      });

      context('when value is blank', () => {
        it('should set empty property value', () => {
          const line = new Line('foo=bar');
          line.value = ' \t ';

          expect(line.source).to.equal('foo=');
          expect(line.key).to.equal('foo');
          expect(line.value).to.equal('');
        });
      });

      context('when value is null', () => {
        it('should set empty property value', () => {
          const line = new Line('foo=bar');
          line.value = null;

          expect(line.source).to.equal('foo=');
          expect(line.key).to.equal('foo');
          expect(line.value).to.equal('');
        });
      });

      context('when line does not contain property information', () => {
        it('should do nothing', () => {
          let line = new Line();
          line.value = 'fizz';

          expect(line.source).to.equal('');
          expect(line.key).to.equal(undefined);
          expect(line.value).to.equal(undefined);

          line = new Line('# foo');
          line.value = 'fizz';

          expect(line.source).to.equal('# foo');
          expect(line.key).to.equal(undefined);
          expect(line.value).to.equal(undefined);
        });
      });
    });
  });
});
