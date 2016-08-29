'use strict'
var asArray = require('./util').asArray
var catchesError = require('./util').catchesError
var INTERNAL = require('./util').INTERNAL

function Promise(fn) {
	if (!(this instanceof Promise) || this._55 !== undefined) {
		throw new TypeError('Promises must be constructed via the "new" keyword.')
	}
	if (typeof fn !== 'function') {
		throw new TypeError('Promises must be constructed with a function argument.')
	}
	this._55 = 0
	this._77 = null
	this._74 = null
	if (fn !== INTERNAL) {
		this._40(fn)
	}
}
Promise.prototype.then = function (onFulfilled, onRejected) {
	return this._56(onFulfilled, onRejected)
}
Promise.prototype.catch = function (onRejected) {
	if (arguments.length > 1) {
		var len = arguments.length - 1
		var args = new Array(len)
		for (var i=0; i<len; i++) {
			args[i] = arguments[i]
		}
		onRejected = arguments[i]
		return this._56(null, function (reason) {
			for (var i=0; i<len; i++) {
				if (catchesError(args[i], reason)) {
					return onRejected(reason)
				}
			}
			throw reason
		})
	}
	return this._56(null, onRejected)
}
Promise.prototype.catchLater = function () {
	this._86()._55 |= 32
	return this
}
module.exports = Promise
Promise.resolve = function (value) {
	if (value instanceof Promise) {
		return value
	}
	var promise = new Promise(INTERNAL)
	promise._1(value)
	return promise
}
Promise.reject = function (reason) {
	var promise = new Promise(INTERNAL)
	promise._95(reason)
	return promise
}
Promise.race = function (iterable) {
	return new Promise(INTERNAL)._40(function (res, rej) {
		var input = asArray(iterable)
		for (var i=0, len=input.length; i<len; i++) {
			Promise.resolve(input[i])._56(res, rej)
		}
	})
}
Promise.all = function (iterable) {
	return new Promise(INTERNAL)._40(function (res, rej) {
		var input = asArray(iterable)
		var pendings = input.length
		var result = new Array(pendings)
		if (pendings === 0) {
			return res(result)
		}
		var resolveItem = function (i) {
			return function (value) {
				result[i] = value
				if (--pendings === 0) {res(result)}
			}
		}
		for (var i=0; i<pendings; i++) {
			Promise.resolve(input[i])._56(resolveItem(i), rej)
		}
	})
}
