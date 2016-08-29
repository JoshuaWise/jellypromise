'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._56 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._26(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._40 = function (handler) {
	var ret = tryCallTwo(handler, this._34(), this._71())
	if (ret === IS_ERROR) {
		this._95(LAST_ERROR)
	}
	return this
}

Promise.prototype._34 = function () {
	var self = this
	return function (value) {self._1(value)}
}
Promise.prototype._71 = function () {
	var self = this
	return function (reason) {self._95(reason)}
}

Promise.prototype._1 = function (newValue) {
	if (this._55 & 7) {
		return
	}
	if (newValue === this) {
		return this._95(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._95(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._55 |= 4
			this._77 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._55 & 24) {
				finale(this)
			} else if (this._55 & 32) {
				this._86()._55 |= 32
			}
			return
		}
	}
	this._55 |= 1
	this._77 = newValue
	finale(this)
}
Promise.prototype._95 = function (newValue) {
	if (this._55 & 7) {
		return
	}
	this._55 |= 2
	this._77 = newValue
	
	
	if (!(this._55 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._26 = function (onFulfilled, onRejected, promise) {
	return this._98({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._98 = function (deferred) {
	var self = this._86()
	var state = self._55
	if (!(state & 32)) {
		self._55 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._55 |= 8
			self._74 = deferred
		} else if (state & 8) {
			self._55 = state & ~8 | 16
			self._74 = [self._74, deferred]
		} else {
			self._74.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._86 = function () {
	var self = this
	while (self._55 & 4) {
		self = self._77
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._55 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._1(self._77)
			} else {
				deferred.promise._95(self._77)
			}
		} else {
			var ret = tryCallOne(cb, self._77)
			if (ret === IS_ERROR) {
				deferred.promise._95(LAST_ERROR)
			} else {
				deferred.promise._1(ret)
			}
		}
	})
}

function finale(self) {
	if (self._55 & 8) {
		self._98(self._74)
		self._74 = null
	} else if (self._55 & 16) {
		var deferreds = self._74
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._98(deferreds[i])
		}
		self._74 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._55 & 32)) {
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
