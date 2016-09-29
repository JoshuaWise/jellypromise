'use strict'
var Promise = require('./promise')
var task = require('./task').init(handleSettled, onUnhandledRejection)
var clc = require('cli-color') // @[/node]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._57 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._28(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._1 = function (handler) {
	var ret = tryCallTwo(handler, this._34(), this._40())
	if (ret === IS_ERROR) {
		this._92(LAST_ERROR)
	}
	return this
}

Promise.prototype._34 = function () {
	var self = this
	return function (value) {self._63(value)}
}
Promise.prototype._40 = function () {
	var self = this
	return function (reason) {self._92(reason)}
}

Promise.prototype._63 = function (newValue) {
	if (this._87 & 7) {
		return
	}
	if (newValue === this) {
		return this._92(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._92(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._87 |= 4
			this._17 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._87 & 24) {
				finale(this)
			} else if (this._87 & 32) {
				this._4()._87 |= 32
			}
			return
		}
	}
	this._87 |= 1
	this._17 = newValue
	finale(this)
}
Promise.prototype._92 = function (newValue) {
	if (this._87 & 7) {
		return
	}
	this._87 |= 2
	this._17 = newValue
	
	
	if (!(this._87 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._28 = function (onFulfilled, onRejected, promise) {
	return this._5({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._5 = function (deferred) {
	var self = this._4()
	var state = self._87
	if (!(state & 32)) {
		self._87 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._87 |= 8
			self._38 = deferred
		} else if (state & 8) {
			self._87 = state & ~8 | 16
			self._38 = [self._38, deferred]
		} else {
			self._38.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._4 = function () {
	var self = this
	while (self._87 & 4) {
		self = self._17
	}
	return self
}

function finale(self) {
	if (self._87 & 8) {
		self._5(self._38)
		self._38 = null
	} else if (self._87 & 16) {
		var deferreds = self._38
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._5(deferreds[i])
		}
		self._38 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._87 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		if (isFulfilled) {
			deferred.promise._63(this._17)
		} else {
			deferred.promise._92(this._17)
		}
	} else {
		var ret = tryCallOne(cb, this._17)
		if (ret === IS_ERROR) {
			deferred.promise._92(LAST_ERROR)
		} else {
			deferred.promise._63(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._87 & 32)) {
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
