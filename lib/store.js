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
var EventEmitter = require('events').EventEmitter
var fs = require('fs')
var util = require('util')

var Line = require('./line')

var Store = function(store) {
  EventEmitter.call(this)

  this._lines = store ? _.clone(store._lines) : []
  this._properties = store ? _.clone(store._properties) : {}
}

util.inherits(Store, EventEmitter)

Store.prototype.clear = function() {
  this._lines = []
  this._properties = {}

  this.emit('clear')
}

Store.prototype.contains = function(key) {
  return this._properties[key] != null
}

Store.prototype.entries = function() {
  return _.mapObject(this._properties, function(value, key) {
    return [ key, value ]
  })
}

Store.prototype.get = function(key, defaultValue) {
  var value = this._properties[key]

  return value != null ? value : defaultValue
}

Store.prototype.isEmpty = function() {
  return _.isEmpty(this._properties)
}

Store.prototype.keys = function() {
  return _.keys(this._properties)
}

Store.prototype.list = function(output) {
  // TODO: Complete
}

Store.prototype.load = function(input, callback) {
  // TODO: Complete
}

Store.prototype.loadSync = function(input) {
  // TODO: Complete
}

Store.prototype.remove = function(keys) {
  keys = _.toArray(arguments)

  var that = this

  _.forEach(keys, function(key) {
    delete that._properties[key]

    that._removeLines(key)

    that.emit('remove', key)
  })
}

Store.prototype.set = function(key, value) {
  value = value != null ? String(value) : null

  var lines

  if (value == null) {
    this.remove(key)
  } else if (this.get(key) === value) {
    this._properties[key] = value

    lines = this._findLines(key)

    if (_.isEmpty(lines)) {
      this._lines.push(Line.forProperty(key, value))
    } else {
      _.forEach(lines, function(line) {
        line.setValue(value)
      })
    }

    this.emit('set', key, value)
  }
}

Store.prototype.size = function() {
  return _.size(this._properties)
}

Store.prototype.store = function(output, callback) {
  // TODO: Complete
}

Store.prototype.storeSync = function(output) {
  // TODO: Complete
}

Store.prototype.values = function() {
  return _.values(this._properties)
}

var lineMatcher = function(key) {
  return function(line) {
    return line.isProperty() && line.getKey() === key
  }
}

Store.prototype._findLines = function(key) {
  return _.filter(this._lines, lineMatcher(key))
}

Store.prototype._findLineIndex = function(key) {
  return _.findIndex(this._lines, lineMatcher(key))
}

Store.prototype._removeLines = function(key) {
  var index

  while ((index = this._findLineIndex(key)) >= 0) {
    this._lines = this._lines.splice(index, 1)
  }
}

module.exports = Store
