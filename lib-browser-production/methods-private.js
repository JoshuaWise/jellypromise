'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._17 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._36(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._64 = function (handler) {
	var ret = tryCallTwo(handler, this._90(), this._11())
	if (ret === IS_ERROR) {
		this._29(LAST_ERROR)
	}
	return this
}

Promise.prototype._90 = function () {
	var self = this
	return function (value) {self._51(value)}
}
Promise.prototype._11 = function () {
	var self = this
	return function (reason) {self._29(reason)}
}

Promise.prototype._51 = function (newValue) {
	if (this._71 & 7) {
		return
	}
	if (newValue === this) {
		return this._29(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._29(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._71 |= 4
			this._37 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._71 & 24) {
				finale(this)
			} else if (this._71 & 32) {
				this._94()._71 |= 32
			}
			return
		}
	}
	this._71 |= 1
	this._37 = newValue
	finale(this)
}
Promise.prototype._29 = function (newValue) {
	if (this._71 & 7) {
		return
	}
	this._71 |= 2
	this._37 = newValue
	
	
	if (!(this._71 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._36 = function (onFulfilled, onRejected, promise) {
	return this._14({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._14 = function (deferred) {
	var self = this._94()
	var state = self._71
	if (!(state & 32)) {
		self._71 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._71 |= 8
			self._53 = deferred
		} else if (state & 8) {
			self._71 = state & ~8 | 16
			self._53 = [self._53, deferred]
		} else {
			self._53.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._94 = function () {
	var self = this
	while (self._71 & 4) {
		self = self._37
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._71 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._51(self._37)
			} else {
				deferred.promise._29(self._37)
			}
		} else {
			var ret = tryCallOne(cb, self._37)
			if (ret === IS_ERROR) {
				deferred.promise._29(LAST_ERROR)
			} else {
				deferred.promise._51(ret)
			}
		}
	})
}

function finale(self) {
	if (self._71 & 8) {
		self._14(self._53)
		self._53 = null
	} else if (self._71 & 16) {
		var deferreds = self._53
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._14(deferreds[i])
		}
		self._53 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._71 & 32)) {
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
