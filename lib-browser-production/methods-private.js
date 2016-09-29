'use strict'
var Promise = require('./promise')
var task = require('./task').init(handleSettled, onUnhandledRejection)
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._70 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._32(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._60 = function (handler) {
	var ret = tryCallTwo(handler, this._21(), this._64())
	if (ret === IS_ERROR) {
		this._31(LAST_ERROR)
	}
	return this
}

Promise.prototype._21 = function () {
	var self = this
	return function (value) {self._3(value)}
}
Promise.prototype._64 = function () {
	var self = this
	return function (reason) {self._31(reason)}
}

Promise.prototype._3 = function (newValue) {
	if (this._18 & 7) {
		return
	}
	if (newValue === this) {
		return this._31(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._31(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._18 |= 4
			this._66 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._18 & 24) {
				finale(this)
			} else if (this._18 & 32) {
				this._2()._18 |= 32
			}
			return
		}
	}
	this._18 |= 1
	this._66 = newValue
	finale(this)
}
Promise.prototype._31 = function (newValue) {
	if (this._18 & 7) {
		return
	}
	this._18 |= 2
	this._66 = newValue
	
	
	if (!(this._18 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._32 = function (onFulfilled, onRejected, promise) {
	return this._96({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._96 = function (deferred) {
	var self = this._2()
	var state = self._18
	if (!(state & 32)) {
		self._18 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._18 |= 8
			self._27 = deferred
		} else if (state & 8) {
			self._18 = state & ~8 | 16
			self._27 = [self._27, deferred]
		} else {
			self._27.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._2 = function () {
	var self = this
	while (self._18 & 4) {
		self = self._66
	}
	return self
}

function finale(self) {
	if (self._18 & 8) {
		self._96(self._27)
		self._27 = null
	} else if (self._18 & 16) {
		var deferreds = self._27
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._96(deferreds[i])
		}
		self._27 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._18 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		if (isFulfilled) {
			deferred.promise._3(this._66)
		} else {
			deferred.promise._31(this._66)
		}
	} else {
		var ret = tryCallOne(cb, this._66)
		if (ret === IS_ERROR) {
			deferred.promise._31(LAST_ERROR)
		} else {
			deferred.promise._3(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._18 & 32)) {
		console.error(
				'Unhandled rejection'
				, reason // @[/production browser]
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
