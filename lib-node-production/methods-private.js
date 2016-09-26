'use strict'
var Promise = require('./promise')
var task = require('./task').init(handleSettled, onUnhandledRejection)
var clc = require('cli-color') // @[/node]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._49 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._90(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._42 = function (handler) {
	var ret = tryCallTwo(handler, this._76(), this._83())
	if (ret === IS_ERROR) {
		this._68(LAST_ERROR)
	}
	return this
}

Promise.prototype._76 = function () {
	var self = this
	return function (value) {self._63(value)}
}
Promise.prototype._83 = function () {
	var self = this
	return function (reason) {self._68(reason)}
}

Promise.prototype._63 = function (newValue) {
	if (this._44 & 7) {
		return
	}
	if (newValue === this) {
		return this._68(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._68(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._44 |= 4
			this._60 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._44 & 24) {
				finale(this)
			} else if (this._44 & 32) {
				this._22()._44 |= 32
			}
			return
		}
	}
	this._44 |= 1
	this._60 = newValue
	finale(this)
}
Promise.prototype._68 = function (newValue) {
	if (this._44 & 7) {
		return
	}
	this._44 |= 2
	this._60 = newValue
	
	
	if (!(this._44 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._90 = function (onFulfilled, onRejected, promise) {
	return this._26({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._26 = function (deferred) {
	var self = this._22()
	var state = self._44
	if (!(state & 32)) {
		self._44 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._44 |= 8
			self._69 = deferred
		} else if (state & 8) {
			self._44 = state & ~8 | 16
			self._69 = [self._69, deferred]
		} else {
			self._69.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._22 = function () {
	var self = this
	while (self._44 & 4) {
		self = self._60
	}
	return self
}

function finale(self) {
	if (self._44 & 8) {
		self._26(self._69)
		self._69 = null
	} else if (self._44 & 16) {
		var deferreds = self._69
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._26(deferreds[i])
		}
		self._69 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._44 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		if (isFulfilled) {
			deferred.promise._63(this._60)
		} else {
			deferred.promise._68(this._60)
		}
	} else {
		var ret = tryCallOne(cb, this._60)
		if (ret === IS_ERROR) {
			deferred.promise._68(LAST_ERROR)
		} else {
			deferred.promise._63(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._44 & 32)) {
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
