'use strict'
var Promise = require('./promise')
var task = require('./task').init(handleSettled, onUnhandledRejection)
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._91 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._50(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._46 = function (handler) {
	var ret = tryCallTwo(handler, this._7(), this._57())
	if (ret === IS_ERROR) {
		this._36(LAST_ERROR)
	}
	return this
}

Promise.prototype._7 = function () {
	var self = this
	return function (value) {self._29(value)}
}
Promise.prototype._57 = function () {
	var self = this
	return function (reason) {self._36(reason)}
}

Promise.prototype._29 = function (newValue) {
	if (this._89 & 7) {
		return
	}
	if (newValue === this) {
		return this._36(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._36(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._89 |= 4
			this._80 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._89 & 24) {
				finale(this)
			} else if (this._89 & 32) {
				this._4()._89 |= 32
			}
			return
		}
	}
	this._89 |= 1
	this._80 = newValue
	finale(this)
}
Promise.prototype._36 = function (newValue) {
	if (this._89 & 7) {
		return
	}
	this._89 |= 2
	this._80 = newValue
	
	
	if (!(this._89 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._50 = function (onFulfilled, onRejected, promise) {
	return this._41({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._41 = function (deferred) {
	var self = this._4()
	var state = self._89
	if (!(state & 32)) {
		self._89 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._89 |= 8
			self._23 = deferred
		} else if (state & 8) {
			self._89 = state & ~8 | 16
			self._23 = [self._23, deferred]
		} else {
			self._23.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._4 = function () {
	var self = this
	while (self._89 & 4) {
		self = self._80
	}
	return self
}

function finale(self) {
	if (self._89 & 8) {
		self._41(self._23)
		self._23 = null
	} else if (self._89 & 16) {
		var deferreds = self._23
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._41(deferreds[i])
		}
		self._23 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._89 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		if (isFulfilled) {
			deferred.promise._29(this._80)
		} else {
			deferred.promise._36(this._80)
		}
	} else {
		var ret = tryCallOne(cb, this._80)
		if (ret === IS_ERROR) {
			deferred.promise._36(LAST_ERROR)
		} else {
			deferred.promise._29(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._89 & 32)) {
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
