'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var clc = require('cli-color') // @[/node]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._44 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._15(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._14 = function (handler) {
	var ret = tryCallTwo(handler, this._52(), this._32())
	if (ret === IS_ERROR) {
		this._40(LAST_ERROR)
	}
	return this
}

Promise.prototype._52 = function () {
	var self = this
	return function (value) {self._91(value)}
}
Promise.prototype._32 = function () {
	var self = this
	return function (reason) {self._40(reason)}
}

Promise.prototype._91 = function (newValue) {
	if (this._31 & 7) {
		return
	}
	if (newValue === this) {
		return this._40(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._40(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._31 |= 4
			this._48 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._31 & 24) {
				finale(this)
			} else if (this._31 & 32) {
				this._53()._31 |= 32
			}
			return
		}
	}
	this._31 |= 1
	this._48 = newValue
	finale(this)
}
Promise.prototype._40 = function (newValue) {
	if (this._31 & 7) {
		return
	}
	this._31 |= 2
	this._48 = newValue
	
	
	if (!(this._31 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._15 = function (onFulfilled, onRejected, promise) {
	return this._35({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._35 = function (deferred) {
	var self = this._53()
	var state = self._31
	if (!(state & 32)) {
		self._31 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._31 |= 8
			self._74 = deferred
		} else if (state & 8) {
			self._31 = state & ~8 | 16
			self._74 = [self._74, deferred]
		} else {
			self._74.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._53 = function () {
	var self = this
	while (self._31 & 4) {
		self = self._48
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._31 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._91(self._48)
			} else {
				deferred.promise._40(self._48)
			}
		} else {
			var ret = tryCallOne(cb, self._48)
			if (ret === IS_ERROR) {
				deferred.promise._40(LAST_ERROR)
			} else {
				deferred.promise._91(ret)
			}
		}
	})
}

function finale(self) {
	if (self._31 & 8) {
		self._35(self._74)
		self._74 = null
	} else if (self._31 & 16) {
		var deferreds = self._74
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._35(deferreds[i])
		}
		self._74 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._31 & 32)) {
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
