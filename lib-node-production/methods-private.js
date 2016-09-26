'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var clc = require('cli-color') // @[/node]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._65 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._87(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._46 = function (handler) {
	var ret = tryCallTwo(handler, this._40(), this._12())
	if (ret === IS_ERROR) {
		this._41(LAST_ERROR)
	}
	return this
}

Promise.prototype._40 = function () {
	var self = this
	return function (value) {self._76(value)}
}
Promise.prototype._12 = function () {
	var self = this
	return function (reason) {self._41(reason)}
}

Promise.prototype._76 = function (newValue) {
	if (this._49 & 7) {
		return
	}
	if (newValue === this) {
		return this._41(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._41(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._49 |= 4
			this._47 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._49 & 24) {
				finale(this)
			} else if (this._49 & 32) {
				this._59()._49 |= 32
			}
			return
		}
	}
	this._49 |= 1
	this._47 = newValue
	finale(this)
}
Promise.prototype._41 = function (newValue) {
	if (this._49 & 7) {
		return
	}
	this._49 |= 2
	this._47 = newValue
	
	
	if (!(this._49 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._87 = function (onFulfilled, onRejected, promise) {
	return this._9({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._9 = function (deferred) {
	var self = this._59()
	var state = self._49
	if (!(state & 32)) {
		self._49 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._49 |= 8
			self._84 = deferred
		} else if (state & 8) {
			self._49 = state & ~8 | 16
			self._84 = [self._84, deferred]
		} else {
			self._84.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._59 = function () {
	var self = this
	while (self._49 & 4) {
		self = self._47
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._49 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._76(self._47)
			} else {
				deferred.promise._41(self._47)
			}
		} else {
			var ret = tryCallOne(cb, self._47)
			if (ret === IS_ERROR) {
				deferred.promise._41(LAST_ERROR)
			} else {
				deferred.promise._76(ret)
			}
		}
	})
}

function finale(self) {
	if (self._49 & 8) {
		self._9(self._84)
		self._84 = null
	} else if (self._49 & 16) {
		var deferreds = self._84
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._9(deferreds[i])
		}
		self._84 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._49 & 32)) {
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
