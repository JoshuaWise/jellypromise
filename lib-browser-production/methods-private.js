'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._61 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	this._51(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._2 = function (handler) {
	var ret = tryCallTwo(handler, this._23(), this._87())
	if (ret === IS_ERROR) {
		this._94(LAST_ERROR)
	}
	return this
}

Promise.prototype._23 = function () {
	var self = this
	return function (value) {self._38(value)}
}
Promise.prototype._87 = function () {
	var self = this
	return function (reason) {self._94(reason)}
}

Promise.prototype._38 = function (newValue) {
	if (this._81 & 7) {
		return
	}
	if (newValue === this) {
		return this._94(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._94(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._81 |= 4
			this._24 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._81 & 24) {
				finale(this)
			} else if (this._81 & 32) {
				this._26()._81 |= 32
			}
			return
		}
	}
	this._81 |= 1
	this._24 = newValue
	finale(this)
}
Promise.prototype._94 = function (newValue) {
	if (this._81 & 7) {
		return
	}
	this._81 |= 2
	this._24 = newValue
	
	
	if (!(this._81 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._51 = function (onFulfilled, onRejected, promise) {
	return this._49({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._49 = function (deferred) {
	var self = this._26()
	var state = self._81
	if (!(state & 32)) {
		self._81 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._81 |= 8
			self._33 = deferred
		} else if (state & 8) {
			self._81 = state & ~8 | 16
			self._33 = [self._33, deferred]
		} else {
			self._33.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._26 = function () {
	var self = this
	while (self._81 & 4) {
		self = self._24
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._81 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (isFulfilled) {
				deferred.promise._38(self._24)
			} else {
				deferred.promise._94(self._24)
			}
		} else {
			var ret = tryCallOne(cb, self._24)
			if (ret === IS_ERROR) {
				deferred.promise._94(LAST_ERROR)
			} else {
				deferred.promise._38(ret)
			}
		}
	})
}

function finale(self) {
	if (self._81 & 8) {
		self._49(self._33)
		self._33 = null
	} else if (self._81 & 16) {
		var deferreds = self._33
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._49(deferreds[i])
		}
		self._33 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._81 & 32)) {
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
