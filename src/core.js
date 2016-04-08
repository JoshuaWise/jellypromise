'use strict'
var asap = require('asap/raw')
var clc = require('cli-color') // @[/development node]
var arrayFrom = require('./array-from')
var warn = require('./warn') // @[/development]
function noop() {}

// States:
// 0 = pending
// 1 = fulfilled with _value
// 2 = rejected with _value
// 3 = adopted the state of another promise, _value
// Once the state is no longer pending (0) it is immutable.
function Promise(fn) {
	if (typeof this !== 'object') {
		throw new TypeError('Promises must be constructed via the "new" keyword.')
	}
	if (typeof fn !== 'function') {
		throw new TypeError('Promises must be constructed with a function argument.')
	}
	this._state = 0
	this._value = null
	this._deferreds = null
	this._deferredState = 0
	this._supressUnhandledRejections = false
	if (fn !== noop) {
		resolveOrReject(this, fn)
	}
}
Promise.prototype.then = function (onFulfilled, onRejected) {
	var res = new Promise(noop)
	handle(this, new Deferred(onFulfilled, onRejected, res))
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
	this._supressUnhandledRejections = true
	return this
}
module.exports = Promise
Promise.resolve = function (value) {
	if (value instanceof Promise) {
		return value
	}
	var promise = new Promise(noop)
	resolve(promise, value)
	return promise
}
Promise.reject = function (reason) {
	var promise = new Promise(noop)
	reject(promise, reason)
	return promise
}
Promise.race = function (iterable) {
	var arr = arrayFrom(iterable)
	return new Promise(function (res, rej) {
		for (var i=0, len=arr.length; i<len; i++) {
			Promise.resolve(arr[i]).then(res, rej)
		}
	})
}
Promise.all = function (iterable) {
	var arr = arrayFrom(iterable)
	return new Promise(function (res, rej) {
		var pendings = arr.length
		if (pendings === 0) {
			return res(arr)
		}
		arr.forEach(function (item, i) {
			Promise.resolve(item).then(function (value) {
				arr[i] = value
				if (--pendings === 0) {res(arr)}
			}, rej)
		})
	})
}

function resolveOrReject(self, fn) {
	var done = false
	var res = tryCallTwo(fn, function (value) { // resolver
		if (!done) {
			done = true
			resolve(self, value)
		}
	}, function (reason) { // rejector
		if (!done) {
			done = true
			reject(self, reason)
		}
	})
	if (!done && res === IS_ERROR) {
		done = true
		reject(self, LAST_ERROR)
	}
}
function resolve(self, newValue) {
	// Promise Resolution Procedure
	// https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
	if (newValue === self) {
		return reject(self, new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return reject(self, LAST_ERROR)
		}
		if (then === self.then && newValue instanceof Promise) {
			// If newValue is a trusted promise, we can optimize their linkage
			// via state === 3.
			self._state = 3
			self._value = newValue
			finale(self)
			return
		} else if (typeof then === 'function') {
			// If newValue is some foreign promise, we have to link them
			// manually via the Promises/A+ `then` method.
			resolveOrReject(self, then.bind(newValue))
			return
		}
	}
	self._state = 1
	self._value = newValue
	finale(self)
}
function reject(self, newValue) {
	self._state = 2
	self._value = newValue
	
	// @[development]
	if (!(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	// @[/]
	
	// If the promise does not have a handler at the end of the current event
	// loop cycle, throw the error.
	if (!self._supressUnhandledRejections) {
		asap(function () {
			if (!self._supressUnhandledRejections) {
				// @[development node]
				console.error(clc.red('Unhandled rejection ' + (newValue instanceof Error
					? newValue.stack || (err.name + ': ' + err.message)
					: String(newValue))
				))
				// @[/]
				// @[production node]
				console.error('Unhandled rejection ' + (newValue instanceof Error
					? newValue.stack || (err.name + ': ' + err.message)
					: String(newValue))
				)
				// @[/]
				// @[browser]
				console.error('Unhandled rejection ' + (newValue instanceof Error
					? newValue.stack || (err.name + ': ' + err.message)
					: String(newValue))
				)
				// @[/]
			}
		})
	}
	
	finale(self)
}
function finale(self) {
	if (self._deferredState === 1) {
		handle(self, self._deferreds)
		self._deferreds = null
	} else if (self._deferredState === 2) {
		var deferreds = self._deferreds
		for (var i=0, len=deferreds.length; i<len; i++) {
			handle(self, deferreds[i])
		}
		self._deferreds = null
	}
}

function handle(self, deferred) {
	while (self._state === 3) {
		self = self._value
	}
	if (!self._supressUnhandledRejections) {
		self._supressUnhandledRejections = true
	}
	if (self._state === 0) {
		if (self._deferredState === 0) {
			self._deferredState = 1
			self._deferreds = deferred
		} else if (self._deferredState === 1) {
			self._deferredState = 2
			self._deferreds = [self._deferreds, deferred]
		} else {
			self._deferreds.push(deferred)
		}
	} else {
		handleResolved(self, deferred)
	}
}
function handleResolved(self, deferred) {
	asap(function () {
		var cb = self._state === 1 ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (self._state === 1) {
				resolve(deferred.promise, self._value)
			} else {
				reject(deferred.promise, self._value)
			}
		} else {
			var ret = tryCallOne(cb, self._value)
			if (ret === IS_ERROR) {
				reject(deferred.promise, LAST_ERROR)
			} else {
				resolve(deferred.promise, ret)
			}
		}
	})
}

function Deferred(onFulfilled, onRejected, promise) {
	this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
	this.onRejected = typeof onRejected === 'function' ? onRejected : null
	this.promise = promise
	// @[development]
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	// @[/]
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

// To avoid using try/catch inside critical functions, we extract them to here.
var LAST_ERROR = null
var IS_ERROR = {}
function getThen(obj) {
	try {
		return obj.then
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
function tryCallOne(fn, a) {
	try {
		return fn(a)
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
function tryCallTwo(fn, a, b) {
	try {
		fn(a, b)
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}

require('./shared').resolve = resolve
require('./shared').noop = noop
