'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var clc = require('cli-color') // @[/node]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._20 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._46(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._74 = function (handler) {
	var ret = tryCallTwo(handler, this._78(), this._61())
	if (ret === IS_ERROR) {
		this._17(LAST_ERROR)
	}
	return this
}

Promise.prototype._78 = function () {
	var self = this
	return function (value) {self._32(value)}
}
Promise.prototype._61 = function () {
	var self = this
	return function (reason) {self._17(reason)}
}

Promise.prototype._32 = function (newValue) {
	if (this._23 & 7) {
		return
	}
	if (newValue === this) {
		return this._17(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._17(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._23 |= 4
			this._58 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._23 & 24) {
				finale(this)
			} else if (this._23 & 32) {
				this._19()._23 |= 32
			}
			return
		}
	}
	this._23 |= 1
	this._58 = newValue
	finale(this)
}
Promise.prototype._17 = function (newValue) {
	if (this._23 & 7) {
		return
	}
	this._23 |= 2
	this._58 = newValue
	
	
	if (!(this._23 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._46 = function (onFulfilled, onRejected, promise) {
	return this._9({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._9 = function (deferred) {
	var self = this._19()
	var state = self._23
	if (!(state & 32)) {
		self._23 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._23 |= 8
			self._70 = deferred
		} else if (state & 8) {
			self._23 = state & ~8 | 16
			self._70 = [self._70, deferred]
		} else {
			self._70.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._19 = function () {
	var self = this
	while (self._23 & 4) {
		self = self._58
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._23 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._32(self._58)
			} else {
				deferred.promise._17(self._58)
			}
		} else {
			var ret = tryCallOne(cb, self._58)
			if (ret === IS_ERROR) {
				deferred.promise._17(LAST_ERROR)
			} else {
				deferred.promise._32(ret)
			}
		}
	})
}

function finale(self) {
	if (self._23 & 8) {
		self._9(self._70)
		self._70 = null
	} else if (self._23 & 16) {
		var deferreds = self._70
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._9(deferreds[i])
		}
		self._70 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._23 & 32)) {
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
