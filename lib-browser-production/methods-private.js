'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._39 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._83(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._1 = function (handler) {
	var ret = tryCallTwo(handler, this._37(), this._98())
	if (ret === IS_ERROR) {
		this._78(LAST_ERROR)
	}
	return this
}

Promise.prototype._37 = function () {
	var self = this
	return function (value) {self._70(value)}
}
Promise.prototype._98 = function () {
	var self = this
	return function (reason) {self._78(reason)}
}

Promise.prototype._70 = function (newValue) {
	if (this._47 & 7) {
		return
	}
	if (newValue === this) {
		return this._78(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._78(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._47 |= 4
			this._6 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._47 & 24) {
				finale(this)
			} else if (this._47 & 32) {
				this._36()._47 |= 32
			}
			return
		}
	}
	this._47 |= 1
	this._6 = newValue
	finale(this)
}
Promise.prototype._78 = function (newValue) {
	if (this._47 & 7) {
		return
	}
	this._47 |= 2
	this._6 = newValue
	
	
	if (!(this._47 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._83 = function (onFulfilled, onRejected, promise) {
	return this._20({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._20 = function (deferred) {
	var self = this._36()
	var state = self._47
	if (!(state & 32)) {
		self._47 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._47 |= 8
			self._87 = deferred
		} else if (state & 8) {
			self._47 = state & ~8 | 16
			self._87 = [self._87, deferred]
		} else {
			self._87.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._36 = function () {
	var self = this
	while (self._47 & 4) {
		self = self._6
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._47 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._70(self._6)
			} else {
				deferred.promise._78(self._6)
			}
		} else {
			var ret = tryCallOne(cb, self._6)
			if (ret === IS_ERROR) {
				deferred.promise._78(LAST_ERROR)
			} else {
				deferred.promise._70(ret)
			}
		}
	})
}

function finale(self) {
	if (self._47 & 8) {
		self._20(self._87)
		self._87 = null
	} else if (self._47 & 16) {
		var deferreds = self._87
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._20(deferreds[i])
		}
		self._87 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._47 & 32)) {
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
