'use strict'
var warn = require('./warn') // @[/development]
var asArray = require('./util').asArray
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
	if (fn !== INTERNAL) {
		this._resolveFromHandler(fn)
	}
}
Promise.prototype.then = function (onFulfilled, onRejected) {
	var res = new Promise(INTERNAL)
	this._handleNew(onFulfilled, onRejected, res)
	return res
}
Promise.prototype.catch = function (onRejected) {
	var len = arguments.length
	if (len === 2) {
		var type = onRejected
		onRejected = arguments[1]
		return this.then(null, function (reason) {
			if (catchType(type, reason)) {
				return onRejected(reason)
			}
			throw reason
		})
	} else if (len > 2) {
		var args = new Array(--len)
		for (var i=0; i<len; i++) {
			args[i] = arguments[i]
		}
		onRejected = arguments[i]
		return this.then(null, function (reason) {
			for (var i=0; i<len; i++) {
				if (catchType(args[i], reason)) {
					return onRejected(reason)
				}
			}
			throw reason
		})
	}
	return this.then(null, onRejected)
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
			Promise.resolve(input[i]).then(res, rej)
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
			Promise.resolve(item).then(function (value) {
				result[i] = value
				if (--pendings === 0) {res(result)}
			}, rej)
		})
	})
}

function catchType(type, reason) {
	if (type === Error || (type && type.prototype instanceof Error)) {
		return reason instanceof type
	}
	if (typeof type === 'function') {
		return !!type(reason)
	}
	if (type && typeof type === 'object') {
		var keys = Object.keys(type)
		for (var i=0, len=keys.length; i<len; i++) {
			var key = keys[i]
			if (reason[key] != type[key]) {
				return false
			}
		}
		return true
	}
	warn('The predicate passed to .catch() is invalid, and will be ignored.') // @[/development]
	return false
}
