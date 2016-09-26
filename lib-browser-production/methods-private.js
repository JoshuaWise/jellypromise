'use strict'
var Promise = require('./promise')
var task = require('./task').init(handleSettled, onUnhandledRejection)
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._48 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._97(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._4 = function (handler) {
	var ret = tryCallTwo(handler, this._81(), this._10())
	if (ret === IS_ERROR) {
		this._57(LAST_ERROR)
	}
	return this
}

Promise.prototype._81 = function () {
	var self = this
	return function (value) {self._69(value)}
}
Promise.prototype._10 = function () {
	var self = this
	return function (reason) {self._57(reason)}
}

Promise.prototype._69 = function (newValue) {
	if (this._76 & 7) {
		return
	}
	if (newValue === this) {
		return this._57(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._57(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._76 |= 4
			this._92 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._76 & 24) {
				finale(this)
			} else if (this._76 & 32) {
				this._96()._76 |= 32
			}
			return
		}
	}
	this._76 |= 1
	this._92 = newValue
	finale(this)
}
Promise.prototype._57 = function (newValue) {
	if (this._76 & 7) {
		return
	}
	this._76 |= 2
	this._92 = newValue
	
	
	if (!(this._76 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._97 = function (onFulfilled, onRejected, promise) {
	return this._39({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._39 = function (deferred) {
	var self = this._96()
	var state = self._76
	if (!(state & 32)) {
		self._76 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._76 |= 8
			self._43 = deferred
		} else if (state & 8) {
			self._76 = state & ~8 | 16
			self._43 = [self._43, deferred]
		} else {
			self._43.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._96 = function () {
	var self = this
	while (self._76 & 4) {
		self = self._92
	}
	return self
}

function finale(self) {
	if (self._76 & 8) {
		self._39(self._43)
		self._43 = null
	} else if (self._76 & 16) {
		var deferreds = self._43
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._39(deferreds[i])
		}
		self._43 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._76 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		if (isFulfilled) {
			deferred.promise._69(this._92)
		} else {
			deferred.promise._57(this._92)
		}
	} else {
		var ret = tryCallOne(cb, this._92)
		if (ret === IS_ERROR) {
			deferred.promise._57(LAST_ERROR)
		} else {
			deferred.promise._69(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._76 & 32)) {
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
