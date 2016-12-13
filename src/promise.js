'use strict'
var iterate = require('./util').iterate
var INTERNAL = require('./util').INTERNAL

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
	this._unhandledFollowers = 0
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
	this._setHandled()
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
		iterate(iterable, function (value) {
			Promise.resolve(value)._handleNew(res, rej, undefined, $NO_INTEGER)
		})
	})
}
Promise.all = function (iterable) {
	var promise = new Promise(INTERNAL)
	promise._follow(Promise.Stream.from(iterable).merge())
	return promise
}
