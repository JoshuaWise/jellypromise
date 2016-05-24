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
Promise.prototype._3 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._67(2) // @[/development]
	this._24(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._50 = function (handler) {
	this._67(2) // @[/development]
	var ret = tryCallTwo__c9d565ea_0267_11e6_8d22_5e5517507c66(handler, this._9(), this._55())
	if (ret === IS_ERROR) {
		this._59(LAST_ERROR)
	}
	return this
}

Promise.prototype._9 = function () {
	var self = this
	return function (value) {self._98(value)}
}
Promise.prototype._55 = function () {
	var self = this
	return function (reason) {self._59(reason)}
}

Promise.prototype._98 = function (newValue) {
	if (this._96 & 7) {
		return
	}
	if (newValue === this) {
		return this._59(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen__c9d565ea_0267_11e6_8d22_5e5517507c66(newValue)
		if (then === IS_ERROR) {
			return this._59(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._96 |= 4
			this._31 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._96 & 24) {
				finale(this)
			} else if (this._96 & 32) {
				this._1()._96 |= 32
			}
			return
		}
	}
	this._96 |= 1
	this._31 = newValue
	finale(this)
}
Promise.prototype._59 = function (newValue) {
	if (this._96 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._96 |= 2
	this._31 = newValue
	
	this._71 = LST.useRejectionStack() || this._71
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	this._73(newValue)
	
	if (!(this._96 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._24 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).')
	}
	return this._82({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._82 = function (deferred) {
	var self = this._1()
	var state = self._96
	if (!(state & 32)) {
		self._96 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._96 |= 8
			self._49 = deferred
		} else if (state & 8) {
			self._96 = state & ~8 | 16
			self._49 = [self._49, deferred]
		} else {
			self._49.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._1 = function () {
	var self = this
	while (self._96 & 4) {
		self = self._31
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._96 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._71 = self._71 // @[/development]
			if (isFulfilled) {
				deferred.promise._98(self._31)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._59(self._31)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.setContext(self, deferred) // @[/development]
			var ret = tryCallOne__c9d565ea_0267_11e6_8d22_5e5517507c66(cb, self._31)
			LST.releaseContext() // @[/development]
			if (ret === IS_ERROR) {
				deferred.promise._59(LAST_ERROR)
			} else {
				deferred.promise._98(ret)
			}
		}
	})
}

function finale(self) {
	if (self._96 & 8) {
		self._82(self._49)
		self._49 = null
	} else if (self._96 & 16) {
		var deferreds = self._49
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._82(deferreds[i])
		}
		self._49 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._96 & 32)) {
			if (Promise.suppressUnhandledRejections) {
				var originalError = console.error
				console.error = function () {console.error = originalError}
			}
			console.error(
				clc.red( // @[/node]
					'Unhandled rejection'
					+ ' ' + String(reason) + '\n' + self._71.getTrace() // @[/development]
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
