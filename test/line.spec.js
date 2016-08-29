/*
 * Copyright (C) 2016 Alasdair Mercer, Skelp
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

'use strict'

var _ = require('underscore')
var expect = require('chai').expect

var Line = require('../lib/line')

describe('Line', function() {
  describe('.forProperty', function() {
    it('should create a Line instance for the property key and value', function() {
      var line = Line.forProperty('foo', 'bar')

      expect(line.getKey()).to.equal('foo')
      expect(line.getValue()).to.equal('bar')
    })

    it('should trim the property key and value', function() {
      var line = Line.forProperty(' \tfoo\t ', ' \tbar\t ')

      expect(line.getKey()).to.equal('foo')
      expect(line.getValue()).to.equal('bar')
    })

    context('when value is omitted', function() {
      it('should use an empty string as value', function() {
        var line = Line.forProperty('foo')

        expect(line.getKey()).to.equal('foo')
        expect(line.getValue()).to.equal('')

        line = Line.forProperty('foo', null)

        expect(line.getKey()).to.equal('foo')
        expect(line.getValue()).to.equal('')
      })
    })
  })

  describe('#getKey', function() {
    it('should return the property key', function() {
      expect(new Line('foo').getKey()).to.equal('foo')
      expect(new Line('foo=').getKey()).to.equal('foo')
      expect(new Line('foo:').getKey()).to.equal('foo')
      expect(new Line('foo=bar').getKey()).to.equal('foo')
      expect(new Line('foo:bar').getKey()).to.equal('foo')
      expect(new Line('foo bar').getKey()).to.equal('foo')
      expect(new Line('foo \t bar').getKey()).to.equal('foo')
    })

    it('should return the trimmed property key', function() {
      expect(new Line(' \tfoo\t ').getKey()).to.equal('foo')
      expect(new Line(' \tfoo\t = ').getKey()).to.equal('foo')
      expect(new Line(' \tfoo\t : ').getKey()).to.equal('foo')
      expect(new Line(' \tfoo\t = \tbar\t ').getKey()).to.equal('foo')
      expect(new Line(' \tfoo\t : \tbar\t ').getKey()).to.equal('foo')
      expect(new Line(' \tfoo \t bar\t ').getKey()).to.equal('foo')
    })

    context('when source does not contain a property', function() {
      it('should throw an error', function() {
        var line = new Line('# foo')

        expect(_.bind(line.getKey, line)).to.throw(Error, /Cannot get key for non-property line/)

        line = new Line('')

        expect(_.bind(line.getKey, line)).to.throw(Error, /Cannot get key for non-property line/)
      })
    })
  })

  describe('#getSource', function() {
    it('should return the source', function() {
      expect(new Line('').getSource()).to.equal('')
      expect(new Line(' \t ').getSource()).to.equal(' \t ')
      expect(new Line(' # foo ').getSource()).to.equal(' # foo ')
      expect(new Line(' ! foo ').getSource()).to.equal(' ! foo ')
      expect(new Line('foo').getSource()).to.equal('foo')
      expect(new Line(' foo bar ').getSource()).to.equal(' foo bar ')
      expect(new Line('foo = bar ').getSource()).to.equal('foo = bar ')
      expect(new Line(' foo:bar').getSource()).to.equal(' foo:bar')
    })
  })

  describe('#getValue', function() {
    it('should return the property value', function() {
      expect(new Line('foo').getValue()).to.equal('')
      expect(new Line('foo=').getValue()).to.equal('')
      expect(new Line('foo:').getValue()).to.equal('')
      expect(new Line('foo=bar').getValue()).to.equal('bar')
      expect(new Line('foo:bar').getValue()).to.equal('bar')
      expect(new Line('foo bar').getValue()).to.equal('bar')
      expect(new Line('foo \t bar').getValue()).to.equal('bar')
    })

    it('should return the trimmed property value', function() {
      expect(new Line(' \tfoo\t ').getValue()).to.equal('')
      expect(new Line(' \tfoo\t = ').getValue()).to.equal('')
      expect(new Line(' \tfoo\t : ').getValue()).to.equal('')
      expect(new Line(' \tfoo\t = \tbar\t ').getValue()).to.equal('bar')
      expect(new Line(' \tfoo\t : \tbar\t ').getValue()).to.equal('bar')
      expect(new Line(' \tfoo \t bar\t ').getValue()).to.equal('bar')
    })

    context('when source does not contain a property', function() {
      it('should throw an error', function() {
        var line = new Line('# foo')

        expect(_.bind(line.getValue, line)).to.throw(Error, /Cannot get value for non-property line/)

        line = new Line('')

        expect(_.bind(line.getValue, line)).to.throw(Error, /Cannot get value for non-property line/)
      })
    })
  })

  describe('#isProperty', function() {
    context('when source contains a property', function() {
      it('should return true', function() {
        expect(new Line('foo').isProperty()).to.be.true
        expect(new Line('foo=').isProperty()).to.be.true
        expect(new Line('foo:').isProperty()).to.be.true
        expect(new Line('foo=bar').isProperty()).to.be.true
        expect(new Line('foo:bar').isProperty()).to.be.true
        expect(new Line('foo bar').isProperty()).to.be.true
        expect(new Line('foo \t bar').isProperty()).to.be.true
        expect(new Line(' \tfoo\t ').isProperty()).to.be.true
        expect(new Line(' \tfoo\t = ').isProperty()).to.be.true
        expect(new Line(' \tfoo\t : ').isProperty()).to.be.true
        expect(new Line(' \tfoo\t = \tbar\t ').isProperty()).to.be.true
        expect(new Line(' \tfoo\t : \tbar\t ').isProperty()).to.be.true
        expect(new Line(' \tfoo bar\t ').isProperty()).to.be.true
        expect(new Line(' \tfoo \t bar\t ').isProperty()).to.be.true
      })
    })

    context('when source does not contain a property', function() {
      it('should return false', function() {
        expect(new Line('').isProperty()).to.be.false
        expect(new Line(' ').isProperty()).to.be.false
        expect(new Line(' \t ').isProperty()).to.be.false
        expect(new Line('#').isProperty()).to.be.false
        expect(new Line('# foo').isProperty()).to.be.false
        expect(new Line(' \t# foo\t ').isProperty()).to.be.false
        expect(new Line('!').isProperty()).to.be.false
        expect(new Line('! foo').isProperty()).to.be.false
        expect(new Line(' \t! foo\t ').isProperty()).to.be.false
      })
    })
  })

  describe('#setValue', function() {
    it('should set the property value', function() {
      var line = new Line('foo=bar')

      line.setValue('baz')

      expect(line.getValue()).to.equal('baz')
      expect(line.getSource()).to.equal('foo=baz')

      line = new Line('foo')

      line.setValue('bar')

      expect(line.getValue()).to.equal('bar')
      expect(line.getSource()).to.equal('foo=bar')
    })

    it('should retain structure of original source', function() {
      var line = new Line(' \t foo \t = \t bar \t ')

      line.setValue('baz')

      expect(line.getValue()).to.equal('baz')
      expect(line.getSource()).to.equal(' \t foo \t = \t baz')

      line = new Line(' \t foo \t : \t bar \t ')

      line.setValue('baz')

      expect(line.getValue()).to.equal('baz')
      expect(line.getSource()).to.equal(' \t foo \t : \t baz')

      line = new Line(' \t foo \t bar \t ')

      line.setValue('baz')

      expect(line.getValue()).to.equal('baz')
      expect(line.getSource()).to.equal(' \t foo \t baz')

      line = new Line(' \t foo \t ')

      line.setValue('bar')

      expect(line.getValue()).to.equal('bar')
      expect(line.getSource()).to.equal(' \t foo \t bar')
    })

    context('when value is omitted', function() {
      it('should use an empty string as value', function() {
        var line = new Line('foo=bar')

        line.setValue()

        expect(line.getValue()).to.equal('')
        expect(line.getSource()).to.equal('foo=')

        line = new Line('foo=bar')

        line.setValue(null)

        expect(line.getValue()).to.equal('')
        expect(line.getSource()).to.equal('foo=')
      })
    })

    context('when source does not contain a property', function() {
      it('should throw an error', function() {
        var line = new Line('# foo')

        expect(_.bind(line.setValue, line, 'bar')).to.throw(Error, /Cannot set value for non-property line/)

        line = new Line('')

        expect(_.bind(line.setValue, line, 'bar')).to.throw(Error, /Cannot set value for non-property line/)
      })
    })
  })
})
