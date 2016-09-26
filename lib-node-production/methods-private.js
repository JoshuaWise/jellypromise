'use strict'
var Promise = require('./promise')
var task = require('./task').init(handleSettled, onUnhandledRejection)
var clc = require('cli-color') // @[/node]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._67 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._36(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._80 = function (handler) {
	var ret = tryCallTwo(handler, this._98(), this._39())
	if (ret === IS_ERROR) {
		this._74(LAST_ERROR)
	}
	return this
}

Promise.prototype._98 = function () {
	var self = this
	return function (value) {self._25(value)}
}
Promise.prototype._39 = function () {
	var self = this
	return function (reason) {self._74(reason)}
}

Promise.prototype._25 = function (newValue) {
	if (this._62 & 7) {
		return
	}
	if (newValue === this) {
		return this._74(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._74(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._62 |= 4
			this._9 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._62 & 24) {
				finale(this)
			} else if (this._62 & 32) {
				this._0()._62 |= 32
			}
			return
		}
	}
	this._62 |= 1
	this._9 = newValue
	finale(this)
}
Promise.prototype._74 = function (newValue) {
	if (this._62 & 7) {
		return
	}
	this._62 |= 2
	this._9 = newValue
	
	
	if (!(this._62 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._36 = function (onFulfilled, onRejected, promise) {
	return this._81({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._81 = function (deferred) {
	var self = this._0()
	var state = self._62
	if (!(state & 32)) {
		self._62 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._62 |= 8
			self._79 = deferred
		} else if (state & 8) {
			self._62 = state & ~8 | 16
			self._79 = [self._79, deferred]
		} else {
			self._79.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._0 = function () {
	var self = this
	while (self._62 & 4) {
		self = self._9
	}
	return self
}

function finale(self) {
	if (self._62 & 8) {
		self._81(self._79)
		self._79 = null
	} else if (self._62 & 16) {
		var deferreds = self._79
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._81(deferreds[i])
		}
		self._79 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._62 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		if (isFulfilled) {
			deferred.promise._25(this._9)
		} else {
			deferred.promise._74(this._9)
		}
	} else {
		var ret = tryCallOne(cb, this._9)
		if (ret === IS_ERROR) {
			deferred.promise._74(LAST_ERROR)
		} else {
			deferred.promise._25(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._62 & 32)) {
		console.error(
			clc.red( // @[/node]
				'Unhandled rejection'
				+ ' ' + String(reason instanceof Error && reason.stack || reason) // @[/production node]
			) // @[/node]
		)
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
