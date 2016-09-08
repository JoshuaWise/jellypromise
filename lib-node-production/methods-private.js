'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var clc = require('cli-color') // @[/node]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._41 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._93(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._64 = function (handler) {
	var ret = tryCallTwo(handler, this._75(), this._10())
	if (ret === IS_ERROR) {
		this._35(LAST_ERROR)
	}
	return this
}

Promise.prototype._75 = function () {
	var self = this
	return function (value) {self._34(value)}
}
Promise.prototype._10 = function () {
	var self = this
	return function (reason) {self._35(reason)}
}

Promise.prototype._34 = function (newValue) {
	if (this._18 & 7) {
		return
	}
	if (newValue === this) {
		return this._35(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._35(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._18 |= 4
			this._74 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._18 & 24) {
				finale(this)
			} else if (this._18 & 32) {
				this._23()._18 |= 32
			}
			return
		}
	}
	this._18 |= 1
	this._74 = newValue
	finale(this)
}
Promise.prototype._35 = function (newValue) {
	if (this._18 & 7) {
		return
	}
	this._18 |= 2
	this._74 = newValue
	
	
	if (!(this._18 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._93 = function (onFulfilled, onRejected, promise) {
	return this._44({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._44 = function (deferred) {
	var self = this._23()
	var state = self._18
	if (!(state & 32)) {
		self._18 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._18 |= 8
			self._43 = deferred
		} else if (state & 8) {
			self._18 = state & ~8 | 16
			self._43 = [self._43, deferred]
		} else {
			self._43.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._23 = function () {
	var self = this
	while (self._18 & 4) {
		self = self._74
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._18 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._34(self._74)
			} else {
				deferred.promise._35(self._74)
			}
		} else {
			var ret = tryCallOne(cb, self._74)
			if (ret === IS_ERROR) {
				deferred.promise._35(LAST_ERROR)
			} else {
				deferred.promise._34(ret)
			}
		}
	})
}

function finale(self) {
	if (self._18 & 8) {
		self._44(self._43)
		self._43 = null
	} else if (self._18 & 16) {
		var deferreds = self._43
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._44(deferreds[i])
		}
		self._43 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._18 & 32)) {
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
