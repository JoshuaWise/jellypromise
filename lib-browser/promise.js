'use strict'
var asArray = require('./util').asArray
var catchesError = require('./util').catchesError
var INTERNAL = require('./util').INTERNAL
var LST = require('./long-stack-traces') // @[/development]

function Promise(fn) {
	if (!(this instanceof Promise) || this._76 !== undefined) {
		throw new TypeError('Promises must be constructed via the "new" keyword.')
	}
	if (typeof fn !== 'function') {
		throw new TypeError('Promises must be constructed with a function argument.')
	}
	this._76 = 0
	this._84 = null
	this._41 = null
	if (fn !== INTERNAL) {
		this._67(fn)
	}
}
Promise.prototype.then = function (onFulfilled, onRejected) {
	return this._87(onFulfilled, onRejected)
}
Promise.prototype.catch = function (onRejected) {
	if (arguments.length > 1) {
		var len = arguments.length - 1
		var args = new Array(len)
		for (var i=0; i<len; i++) {
			args[i] = arguments[i]
		}
		onRejected = arguments[i]
		var self = this // @[/development]
		return this._87(null, function (reason) {
			for (var i=0; i<len; i++) {
				if (catchesError(args[i], reason)) {
					return onRejected(reason)
				}
			}
			LST.setRejectionStack(self._2()._32) // @[/development]
			throw reason
		})
	}
	return this._87(null, onRejected)
}
Promise.prototype.catchLater = function () {
	this._2()._76 |= 32
	return this
}
module.exports = Promise
Promise.resolve = function (value) {
	if (value instanceof Promise) {
		return value
	}
	var promise = new Promise(INTERNAL)
	promise._61(1) // @[/development]
	promise._20(value)
	return promise
}
Promise.reject = function (reason) {
	var promise = new Promise(INTERNAL)
	promise._61(1) // @[/development]
	promise._15(reason)
	return promise
}
Promise.race = function (iterable) {
	return new Promise(INTERNAL)._67(function (res, rej) {
		var input = asArray(iterable)
		rej = LST.upgradeRejector(rej) // @[/development]
		for (var i=0, len=input.length; i<len; i++) {
			Promise.resolve(input[i])._87(res, rej)
		}
	})
}
Promise.all = function (iterable) {
	return new Promise(INTERNAL)._67(function (res, rej) {
		var input = asArray(iterable)
		var pendings = input.length
		var result = new Array(pendings)
		if (pendings === 0) {
			return res(result)
		}
		rej = LST.upgradeRejector(rej) // @[/development]
		var resolveItem = function (i) {
			return function (value) {
				result[i] = value
				if (--pendings === 0) {res(result)}
			}
		}
		for (var i=0; i<pendings; i++) {
			Promise.resolve(input[i])._87(resolveItem(i), rej)
		}
	})
}