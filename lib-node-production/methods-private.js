'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var clc = require('cli-color') // @[/node]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._65 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._59(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._3 = function (handler) {
	var ret = tryCallTwo(handler, this._29(), this._39())
	if (ret === IS_ERROR) {
		this._56(LAST_ERROR)
	}
	return this
}

Promise.prototype._29 = function () {
	var self = this
	return function (value) {self._64(value)}
}
Promise.prototype._39 = function () {
	var self = this
	return function (reason) {self._56(reason)}
}

Promise.prototype._64 = function (newValue) {
	if (this._21 & 7) {
		return
	}
	if (newValue === this) {
		return this._56(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._56(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._21 |= 4
			this._74 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._21 & 24) {
				finale(this)
			} else if (this._21 & 32) {
				this._1()._21 |= 32
			}
			return
		}
	}
	this._21 |= 1
	this._74 = newValue
	finale(this)
}
Promise.prototype._56 = function (newValue) {
	if (this._21 & 7) {
		return
	}
	this._21 |= 2
	this._74 = newValue
	
	
	if (!(this._21 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._59 = function (onFulfilled, onRejected, promise) {
	return this._57({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._57 = function (deferred) {
	var self = this._1()
	var state = self._21
	if (!(state & 32)) {
		self._21 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._21 |= 8
			self._23 = deferred
		} else if (state & 8) {
			self._21 = state & ~8 | 16
			self._23 = [self._23, deferred]
		} else {
			self._23.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._1 = function () {
	var self = this
	while (self._21 & 4) {
		self = self._74
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._21 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._64(self._74)
			} else {
				deferred.promise._56(self._74)
			}
		} else {
			var ret = tryCallOne(cb, self._74)
			if (ret === IS_ERROR) {
				deferred.promise._56(LAST_ERROR)
			} else {
				deferred.promise._64(ret)
			}
		}
	})
}

function finale(self) {
	if (self._21 & 8) {
		self._57(self._23)
		self._23 = null
	} else if (self._21 & 16) {
		var deferreds = self._23
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._57(deferreds[i])
		}
		self._23 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._21 & 32)) {
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
