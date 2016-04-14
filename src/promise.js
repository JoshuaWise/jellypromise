'use strict'
var asArray = require('./util').asArray
var catchesError = require('./util').catchesError
var INTERNAL = require('./util').INTERNAL

function Promise(fn) {
	if (typeof this !== 'object') {
		throw new TypeError('Promises must be constructed via the "new" keyword.')
	}
	if (typeof fn !== 'function') {
		throw new TypeError('Promises must be constructed with a function argument.')
	}
	this._state = $NO_STATE
	this._value = null
	this._deferreds = null
	this._initStackTrace() // @[/development]
	if (fn !== INTERNAL) {
		this._unvoidStackTrace(Promise) // @[/development]
		this._resolveFromHandler(fn)
	}
}
Promise.prototype.then = function (onFulfilled, onRejected) {
	return this._then(onFulfilled, onRejected)._parent(this)
}
Promise.prototype.catch = function (onRejected) {
	if (arguments.length > 1) {
		var len = arguments.length - 1
		var args = new Array(len)
		for (var i=0; i<len; i++) {
			args[i] = arguments[i]
		}
		onRejected = arguments[i]
		return this._then(null, function (reason) {
			for (var i=0; i<len; i++) {
				if (catchesError(args[i], reason)) {
					return onRejected(reason)
				}
			}
			throw reason
		})._parent(this)
	}
	return this._then(null, onRejected)._parent(this)
}
Promise.prototype.catchLater = function () {
	this._state |= $SUPRESS_UNHANDLED_REJECTIONS
	return this
}
module.exports = Promise
Promise.resolve = function (value) {
	if (value instanceof Promise) {
		return value
	}
	var promise = new Promise(INTERNAL)
	promise._unvoidStackTrace() // @[/development]
	promise._resolve(value)
	return promise
}
Promise.reject = function (reason) {
	var promise = new Promise(INTERNAL)
	promise._unvoidStackTrace() // @[/development]
	promise._reject(reason)
	return promise
}
Promise.race = function (iterable) {
	return new Promise(function (res, rej) {
		var input = asArray(iterable)
		for (var i=0, len=input.length; i<len; i++) {
			cast(input[i])._then(res, rej)
		}
	})
}
Promise.all = function (iterable) {
	return new Promise(function (res, rej) {
		var input = asArray(iterable)
		var pendings = input.length
		var result = new Array(pendings)
		if (pendings === 0) {
			return res(result)
		}
		input.forEach(function (item, i) {
			cast(item)._then(function (value) {
				result[i] = value
				if (--pendings === 0) {res(result)}
			}, rej)
		})
	})
}

// Like Promise.resolve(), but without capturing a stack trace.
// @[development]
var cast = require('./util').cast = function (value) {
	if (value instanceof Promise) {
		return value
	}
	var promise = new Promise(INTERNAL)
	promise._resolve(value)
	return promise
}
// @[/]
// @[production]
var cast = require('./util').cast = Promise.resolve
// @[/]
