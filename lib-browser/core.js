'use strict'
var asap = require('asap/raw')
var toArray = require('./to-array')
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
	this._81 = 0
	this._25 = null
	this._92 = null
	this._95 = 0
	this._53 = false
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
	this._53 = true
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
	var arr = toArray(iterable)
	return new Promise(function (res, rej) {
		for (var i=0, len=arr.length; i<len; i++) {
			Promise.resolve(arr[i]).then(res, rej)
		}
	})
}
Promise.all = function (iterable) {
	var arr = toArray(iterable)
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
			self._81 = 3
			self._25 = newValue
			finale(self)
			return
		} else if (typeof then === 'function') {
			// If newValue is some foreign promise, we have to link them
			// manually via the Promises/A+ `then` method.
			resolveOrReject(self, then.bind(newValue))
			return
		}
	}
	self._81 = 1
	self._25 = newValue
	finale(self)
}
function reject(self, newValue) {
	self._81 = 2
	self._25 = newValue
	
	// If the promise does not have a handler at the end of the current event
	// loop cycle, throw the error.
	if (!self._53) {
		asap(function () {
			if (!self._53) {
				console.error('Unhandled rejection ' + (newValue instanceof Error
					? newValue.stack || (err.name + ': ' + err.message)
					: String(newValue))
				)
			}
		})
	}
	
	finale(self)
}
function finale(self) {
	if (self._95 === 1) {
		handle(self, self._92)
		self._92 = null
	} else if (self._95 === 2) {
		var deferreds = self._92
		for (var i=0, len=deferreds.length; i<len; i++) {
			handle(self, deferreds[i])
		}
		self._92 = null
	}
}

function handle(self, deferred) {
	while (self._81 === 3) {
		self = self._25
	}
	if (!self._53) {
		self._53 = true
	}
	if (self._81 === 0) {
		if (self._95 === 0) {
			self._95 = 1
			self._92 = deferred
		} else if (self._95 === 1) {
			self._95 = 2
			self._92 = [self._92, deferred]
		} else {
			self._92.push(deferred)
		}
	} else {
		handleResolved(self, deferred)
	}
}
function handleResolved(self, deferred) {
	asap(function () {
		var cb = self._81 === 1 ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (self._81 === 1) {
				resolve(deferred.promise, self._25)
			} else {
				reject(deferred.promise, self._25)
			}
		} else {
			var ret = tryCallOne(cb, self._25)
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
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
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
