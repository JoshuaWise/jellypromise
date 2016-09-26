'use strict'
var asArray = require('./util').asArray
var catchesError = require('./util').catchesError
var INTERNAL = require('./util').INTERNAL

function Promise(fn) {
	if (!(this instanceof Promise) || this._81 !== undefined) {
		throw new TypeError('Promises must be constructed via the "new" keyword.')
	}
	if (typeof fn !== 'function') {
		throw new TypeError('Promises must be constructed with a function argument.')
	}
	this._81 = 0
	this._24 = null
	this._33 = null
	if (fn !== INTERNAL) {
		this._2(fn)
	}
}
Promise.prototype.then = function (onFulfilled, onRejected) {
	return this._61(onFulfilled, onRejected)
}
Promise.prototype.catch = function (onRejected) {
	if (arguments.length > 1) {
		var len = arguments.length - 1
		var args = new Array(len)
		for (var i=0; i<len; i++) {
			args[i] = arguments[i]
		}
		onRejected = arguments[i]
		var newPromise
		return newPromise = this._61(null, function (reason) {
			for (var i=0; i<len; i++) {
				if (catchesError(args[i], reason)) {return onRejected(reason)} // @[/production]
			}
			throw reason
		})
	}
	return this._61(null, onRejected)
}
Promise.prototype.catchLater = function () {
	this._26()._81 |= 32
	return this
}
module.exports = Promise
Promise.resolve = function (value) {
	if (value instanceof Promise) {
		return value
	}
	var promise = new Promise(INTERNAL)
	promise._38(value)
	return promise
}
Promise.reject = function (reason) {
	var promise = new Promise(INTERNAL)
	promise._94(reason)
	return promise
}
Promise.race = function (iterable) {
	return new Promise(INTERNAL)._2(function (res, rej) {
		var input = asArray(iterable)
		for (var i=0, len=input.length; i<len; i++) {
			Promise.resolve(input[i])._61(res, rej)
		}
	})
}
Promise.all = function (iterable) {
	return new Promise(INTERNAL)._2(function (res, rej) {
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
			Promise.resolve(input[i])._61(resolveItem(i), rej)
		}
	})
}
