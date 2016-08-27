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

/* eslint no-underscore-dangle: [ "error", { "allow": [ "_lines", "_properties"] } ] */

'use strict'

var Line = require('./line')

var Store = function(store) {
  this._lines = store ? [].concat(store._lines) : []
  this._properties = store ? [].concat(store._properties) : []
}

Store.prototype.clear = function() {
  // TODO: Complete
}

Store.prototype.contains = function(key) {
  // TODO: Complete
}

Store.prototype.entries = function() {
  // TODO: Complete
}

Store.prototype.get = function(key, defaultValue) {
  // TODO: Complete
}

Store.prototype.isEmpty = function() {
  // TODO: Complete
}

Store.prototype.keys = function() {
  // TODO: Complete
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

Store.prototype.remove = function(key) {
  // TODO: Complete
}

Store.prototype.set = function(key, value) {
  // TODO: Complete
}

Store.prototype.size = function() {
  // TODO: Complete
}

Store.prototype.store = function(output, callback) {
  // TODO: Complete
}

Store.prototype.storeSync = function(output) {
  // TODO: Complete
}

Store.prototype.values = function() {
  // TODO: Complete
}

module.exports = Store
