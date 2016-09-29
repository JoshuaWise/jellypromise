'use strict'
var asArray = require('./util').asArray
var catchesError = require('./util').catchesError
var INTERNAL = require('./util').INTERNAL

function Promise(fn) {
	if (!(this instanceof Promise) || this._18 !== undefined) {
		throw new TypeError('Promises must be constructed via the "new" keyword.')
	}
	if (typeof fn !== 'function') {
		throw new TypeError('Promises must be constructed with a function argument.')
	}
	this._18 = 0
	this._66 = null
	this._27 = null
	if (fn !== INTERNAL) {
		this._60(fn)
	}
}
Promise.prototype.then = function (onFulfilled, onRejected) {
	return this._70(onFulfilled, onRejected)
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
		return newPromise = this._70(null, function (reason) {
			for (var i=0; i<len; i++) {
				if (catchesError(args[i], reason)) {return onRejected(reason)} // @[/production]
			}
			throw reason
		})
	}
	return this._70(null, onRejected)
}
Promise.prototype.catchLater = function () {
	this._2()._18 |= 32
	return this
}
module.exports = Promise
Promise.resolve = function (value) {
	if (value instanceof Promise) {
		return value
	}
	var promise = new Promise(INTERNAL)
	promise._3(value)
	return promise
}
Promise.reject = function (reason) {
	var promise = new Promise(INTERNAL)
	promise._31(reason)
	return promise
}
Promise.race = function (iterable) {
	return new Promise(INTERNAL)._60(function (res, rej) {
		var input = asArray(iterable)
		for (var i=0, len=input.length; i<len; i++) {
			Promise.resolve(input[i])._70(res, rej)
		}
	})
}
Promise.all = function (iterable) {
	return new Promise(INTERNAL)._60(function (res, rej) {
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
			Promise.resolve(input[i])._70(resolveItem(i), rej)
		}
	})
}
