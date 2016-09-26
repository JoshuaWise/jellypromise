'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var clc = require('cli-color') // @[/node]
var INTERNAL = require('./util').INTERNAL
var warn = require('./warn') // @[/development]
var LST = require('./long-stack-traces') // @[/development]
var PASSTHROUGH_REJECTION = false // @[/development]

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._25 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._3(2) // @[/development]
	this._35(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._2 = function (handler) {
	this._3(2) // @[/development]
	var ret = tryCallTwo(handler, this._81(), this._28())
	if (ret === IS_ERROR) {
		this._75(LAST_ERROR)
	}
	return this
}

Promise.prototype._81 = function () {
	var self = this
	return function (value) {self._90(value)}
}
Promise.prototype._28 = function () {
	var self = this
	return function (reason) {self._75(reason)}
}

Promise.prototype._90 = function (newValue) {
	if (this._10 & 7) {
		return
	}
	if (newValue === this) {
		return this._75(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._75(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._10 |= 4
			this._12 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._10 & 24) {
				finale(this)
			} else if (this._10 & 32) {
				this._53()._10 |= 32
			}
			return
		}
	}
	this._10 |= 1
	this._12 = newValue
	finale(this)
}
Promise.prototype._75 = function (newValue) {
	if (this._10 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._10 |= 2
	this._12 = newValue
	
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? 'null' :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type, this._15)
	}
	this._15 = LST.useRejectionStack() || this._15
	this._20(newValue)
	
	if (!(this._10 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._35 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).', promise._15)
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).', promise._15)
	}
	return this._44({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._44 = function (deferred) {
	var self = this._53()
	var state = self._10
	if (!(state & 32)) {
		self._10 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._10 |= 8
			self._73 = deferred
		} else if (state & 8) {
			self._10 = state & ~8 | 16
			self._73 = [self._73, deferred]
		} else {
			self._73.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._53 = function () {
	var self = this
	while (self._10 & 4) {
		self = self._12
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._10 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._15 = self._15 // @[/development]
			if (isFulfilled) {
				deferred.promise._90(self._12)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._75(self._12)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.setContext(self, deferred) // @[/development]
			var ret = tryCallOne(cb, self._12)
			LST.releaseContext() // @[/development]
			if (ret === IS_ERROR) {
				deferred.promise._75(LAST_ERROR)
			} else {
				deferred.promise._90(ret)
			}
		}
	})
}

function finale(self) {
	if (self._10 & 8) {
		self._44(self._73)
		self._73 = null
	} else if (self._10 & 16) {
		var deferreds = self._73
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._44(deferreds[i])
		}
		self._73 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._10 & 32)) {
			if (Promise.suppressUnhandledRejections) {
				var originalError = console.error
				console.error = function () {console.error = originalError}
			}
			console.error(
				clc.red( // @[/node]
					'Unhandled rejection'
					+ ' ' + String(reason) + '\n' + self._15.getTrace() // @[/development]
				) // @[/node]
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
