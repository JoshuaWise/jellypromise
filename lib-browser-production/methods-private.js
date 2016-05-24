'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._65 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._45(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._88 = function (handler) {
	var ret = tryCallTwo(handler, this._79(), this._68())
	if (ret === IS_ERROR) {
		this._48(LAST_ERROR)
	}
	return this
}

Promise.prototype._79 = function () {
	var self = this
	return function (value) {self._3(value)}
}
Promise.prototype._68 = function () {
	var self = this
	return function (reason) {self._48(reason)}
}

Promise.prototype._3 = function (newValue) {
	if (this._94 & 7) {
		return
	}
	if (newValue === this) {
		return this._48(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._48(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._94 |= 4
			this._55 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._94 & 24) {
				finale(this)
			} else if (this._94 & 32) {
				this._98()._94 |= 32
			}
			return
		}
	}
	this._94 |= 1
	this._55 = newValue
	finale(this)
}
Promise.prototype._48 = function (newValue) {
	if (this._94 & 7) {
		return
	}
	this._94 |= 2
	this._55 = newValue
	
	
	if (!(this._94 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._45 = function (onFulfilled, onRejected, promise) {
	return this._99({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._99 = function (deferred) {
	var self = this._98()
	var state = self._94
	if (!(state & 32)) {
		self._94 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._94 |= 8
			self._96 = deferred
		} else if (state & 8) {
			self._94 = state & ~8 | 16
			self._96 = [self._96, deferred]
		} else {
			self._96.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._98 = function () {
	var self = this
	while (self._94 & 4) {
		self = self._55
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._94 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._3(self._55)
			} else {
				deferred.promise._48(self._55)
			}
		} else {
			var ret = tryCallOne(cb, self._55)
			if (ret === IS_ERROR) {
				deferred.promise._48(LAST_ERROR)
			} else {
				deferred.promise._3(ret)
			}
		}
	})
}

function finale(self) {
	if (self._94 & 8) {
		self._99(self._96)
		self._96 = null
	} else if (self._94 & 16) {
		var deferreds = self._96
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._99(deferreds[i])
		}
		self._96 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._94 & 32)) {
			console.error(
					'Unhandled rejection'
					, reason // @[/production browser]
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
