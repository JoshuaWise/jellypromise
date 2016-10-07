'use strict'
var asArray = require('./util').asArray
var INTERNAL = require('./util').INTERNAL
var LST = require('./long-stack-traces') // @[/development]

function Promise(fn) {
	if (!(this instanceof Promise) || this._state !== undefined) {
		throw new TypeError('Promises must be constructed via the "new" keyword.')
	}
	if (typeof fn !== 'function') {
		throw new TypeError('Promises must be constructed with a function argument.')
	}
	this._state = $NO_STATE
	this._value = undefined
	this._deferreds = undefined
	this._addStackTrace(Promise) // @[/development]
	if (fn !== INTERNAL) {
		this._resolveFromHandler(fn)
	}
}
Promise.prototype.then = function (onFulfilled, onRejected) {
	return this._then(onFulfilled, onRejected)
}
Promise.prototype.catch = function (onRejected, onRejectedWhenTheresAPredicate) {
	return arguments.length > 1
		? typeof onRejectedWhenTheresAPredicate === 'function'
			? this._conditionalCatch(onRejected, onRejectedWhenTheresAPredicate)
			: this._then(undefined, onRejectedWhenTheresAPredicate)
		: this._then(undefined, onRejected)
}
Promise.prototype.catchLater = function () {
	this._getFollowee()._state |= $SUPPRESS_UNHANDLED_REJECTIONS
	return this
}
module.exports = Promise
Promise.resolve = function (value) {
	if (value instanceof Promise) {
		return value
	}
	var promise = new Promise(INTERNAL)
	promise._resolve(value)
	return promise
}
Promise.reject = function (reason) {
	var promise = new Promise(INTERNAL)
	promise._reject(reason)
	return promise
}
Promise.race = function (iterable) {
	return new Promise(function (res, rej) {
		var input = asArray(iterable)
		for (var i=0, len=input.length; i<len; i++) {
			Promise.resolve(input[i])._then(res, rej)
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
		var resolveItem = function (i) {
			return function (value) {
				result[i] = value
				if (--pendings === 0) {res(result)}
			}
		}
		for (var i=0; i<pendings; i++) {
			Promise.resolve(input[i])._then(resolveItem(i), rej)
		}
	})
}
