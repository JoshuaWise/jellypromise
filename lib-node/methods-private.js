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
Promise.prototype._49 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._91(2) // @[/development]
	this._55(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._28 = function (handler) {
	this._91(2) // @[/development]
	var ret = tryCallTwo__c9d565ea_0267_11e6_8d22_5e5517507c66(handler, this._81(), this._58())
	if (ret === IS_ERROR) {
		this._96(LAST_ERROR)
	}
	return this
}

Promise.prototype._81 = function () {
	var self = this
	return function (value) {self._25(value)}
}
Promise.prototype._58 = function () {
	var self = this
	return function (reason) {self._96(reason)}
}

Promise.prototype._25 = function (newValue) {
	if (this._14 & 7) {
		return
	}
	if (newValue === this) {
		return this._96(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen__c9d565ea_0267_11e6_8d22_5e5517507c66(newValue)
		if (then === IS_ERROR) {
			return this._96(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._14 |= 4
			this._72 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._14 & 24) {
				finale(this)
			} else if (this._14 & 32) {
				this._7()._14 |= 32
			}
			return
		}
	}
	this._14 |= 1
	this._72 = newValue
	finale(this)
}
Promise.prototype._96 = function (newValue) {
	if (this._14 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._14 |= 2
	this._72 = newValue
	
	this._95 = LST.useRejectionStack() || this._95
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	this._68(newValue)
	
	if (!(this._14 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._55 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).')
	}
	return this._79({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._79 = function (deferred) {
	var self = this._7()
	var state = self._14
	if (!(state & 32)) {
		self._14 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._14 |= 8
			self._19 = deferred
		} else if (state & 8) {
			self._14 = state & ~8 | 16
			self._19 = [self._19, deferred]
		} else {
			self._19.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._7 = function () {
	var self = this
	while (self._14 & 4) {
		self = self._72
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._14 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._95 = self._95 // @[/development]
			if (isFulfilled) {
				deferred.promise._25(self._72)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._96(self._72)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.setContext(self, deferred) // @[/development]
			var ret = tryCallOne__c9d565ea_0267_11e6_8d22_5e5517507c66(cb, self._72)
			LST.releaseContext() // @[/development]
			if (ret === IS_ERROR) {
				deferred.promise._96(LAST_ERROR)
			} else {
				deferred.promise._25(ret)
			}
		}
	})
}

function finale(self) {
	if (self._14 & 8) {
		self._79(self._19)
		self._19 = null
	} else if (self._14 & 16) {
		var deferreds = self._19
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._79(deferreds[i])
		}
		self._19 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._14 & 32)) {
			if (Promise.suppressUnhandledRejections) {
				var originalError = console.error
				console.error = function () {console.error = originalError}
			}
			console.error(
				clc.red( // @[/node]
					'Unhandled rejection'
					+ ' ' + String(reason) + '\n' + self._95.getTrace() // @[/development]
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
function getThen__c9d565ea_0267_11e6_8d22_5e5517507c66(obj) {
	try {
		return obj.then
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
function tryCallOne__c9d565ea_0267_11e6_8d22_5e5517507c66(fn, a) {
	try {
		return fn(a)
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
function tryCallTwo__c9d565ea_0267_11e6_8d22_5e5517507c66(fn, a, b) {
	try {
		fn(a, b)
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
