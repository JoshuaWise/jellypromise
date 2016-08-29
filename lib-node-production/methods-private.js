'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var clc = require('cli-color') // @[/node]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._40 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._72(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._62 = function (handler) {
	var ret = tryCallTwo(handler, this._46(), this._19())
	if (ret === IS_ERROR) {
		this._13(LAST_ERROR)
	}
	return this
}

Promise.prototype._46 = function () {
	var self = this
	return function (value) {self._39(value)}
}
Promise.prototype._19 = function () {
	var self = this
	return function (reason) {self._13(reason)}
}

Promise.prototype._39 = function (newValue) {
	if (this._11 & 7) {
		return
	}
	if (newValue === this) {
		return this._13(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._13(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._11 |= 4
			this._77 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._11 & 24) {
				finale(this)
			} else if (this._11 & 32) {
				this._74()._11 |= 32
			}
			return
		}
	}
	this._11 |= 1
	this._77 = newValue
	finale(this)
}
Promise.prototype._13 = function (newValue) {
	if (this._11 & 7) {
		return
	}
	this._11 |= 2
	this._77 = newValue
	
	
	if (!(this._11 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._72 = function (onFulfilled, onRejected, promise) {
	return this._53({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._53 = function (deferred) {
	var self = this._74()
	var state = self._11
	if (!(state & 32)) {
		self._11 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._11 |= 8
			self._16 = deferred
		} else if (state & 8) {
			self._11 = state & ~8 | 16
			self._16 = [self._16, deferred]
		} else {
			self._16.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._74 = function () {
	var self = this
	while (self._11 & 4) {
		self = self._77
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._11 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._39(self._77)
			} else {
				deferred.promise._13(self._77)
			}
		} else {
			var ret = tryCallOne(cb, self._77)
			if (ret === IS_ERROR) {
				deferred.promise._13(LAST_ERROR)
			} else {
				deferred.promise._39(ret)
			}
		}
	})
}

function finale(self) {
	if (self._11 & 8) {
		self._53(self._16)
		self._16 = null
	} else if (self._11 & 16) {
		var deferreds = self._16
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._53(deferreds[i])
		}
		self._16 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._11 & 32)) {
			console.error(
				clc.red( // @[/node]
					'Unhandled rejection'
					+ ' ' + String(reason instanceof Error && reason.stack || reason) // @[/production node]
				) // @[/node]
			)
		}
	}
}

function foreignPromise(promise, then) {
	return new Promise(function (res, rej) {return then.call(promise, res, rej)})
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
