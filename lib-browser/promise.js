'use strict'
var asArray = require('./util').asArray
var catchesError = require('./util').catchesError
var INTERNAL = require('./util').INTERNAL
var LST = require('./long-stack-traces') // @[/development]

function Promise(fn) {
	if (!(this instanceof Promise) || this._24 !== undefined) {
		throw new TypeError('Promises must be constructed via the "new" keyword.')
	}
	if (typeof fn !== 'function') {
		throw new TypeError('Promises must be constructed with a function argument.')
	}
	this._24 = 0
	this._1 = null
	this._99 = null
	if (fn !== INTERNAL) {
		this._84(fn)
	}
}
Promise.prototype.then = function (onFulfilled, onRejected) {
	return this._85(onFulfilled, onRejected)
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
		return this._85(null, function (reason) {
			for (var i=0; i<len; i++) {
				if (catchesError(args[i], reason)) {
					return onRejected(reason)
				}
			}
			LST.setRejectionStack(self._21()._40) // @[/development]
			throw reason
		})
	}
	return this._85(null, onRejected)
}
Promise.prototype.catchLater = function () {
	this._21()._24 |= 32
	return this
}
module.exports = Promise
Promise.resolve = function (value) {
	if (value instanceof Promise) {
		return value
	}
	var promise = new Promise(INTERNAL)
	promise._78(1) // @[/development]
	promise._17(value)
	return promise
}
Promise.reject = function (reason) {
	var promise = new Promise(INTERNAL)
	promise._78(1) // @[/development]
	promise._95(reason)
	return promise
}
Promise.race = function (iterable) {
	return new Promise(INTERNAL)._84(function (res, rej) {
		var input = asArray(iterable)
		rej = LST.upgradeRejector(rej) // @[/development]
		for (var i=0, len=input.length; i<len; i++) {
			Promise.resolve(input[i])._85(res, rej)
		}
	})
}
Promise.all = function (iterable) {
	return new Promise(INTERNAL)._84(function (res, rej) {
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
			Promise.resolve(input[i])._85(resolveItem(i), rej)
		}
	})
}
