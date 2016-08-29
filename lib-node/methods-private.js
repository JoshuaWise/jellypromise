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
Promise.prototype._81 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._37(2) // @[/development]
	this._21(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._93 = function (handler) {
	this._37(2) // @[/development]
	var ret = tryCallTwo__c9d565ea_0267_11e6_8d22_5e5517507c66(handler, this._77(), this._69())
	if (ret === IS_ERROR) {
		this._53(LAST_ERROR)
	}
	return this
}

Promise.prototype._77 = function () {
	var self = this
	return function (value) {self._41(value)}
}
Promise.prototype._69 = function () {
	var self = this
	return function (reason) {self._53(reason)}
}

Promise.prototype._41 = function (newValue) {
	if (this._97 & 7) {
		return
	}
	if (newValue === this) {
		return this._53(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen__c9d565ea_0267_11e6_8d22_5e5517507c66(newValue)
		if (then === IS_ERROR) {
			return this._53(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._97 |= 4
			this._27 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._97 & 24) {
				finale(this)
			} else if (this._97 & 32) {
				this._58()._97 |= 32
			}
			return
		}
	}
	this._97 |= 1
	this._27 = newValue
	finale(this)
}
Promise.prototype._53 = function (newValue) {
	if (this._97 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._97 |= 2
	this._27 = newValue
	
	this._5 = LST.useRejectionStack() || this._5
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	this._48(newValue)
	
	if (!(this._97 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._21 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).')
	}
	return this._87({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._87 = function (deferred) {
	var self = this._58()
	var state = self._97
	if (!(state & 32)) {
		self._97 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._97 |= 8
			self._73 = deferred
		} else if (state & 8) {
			self._97 = state & ~8 | 16
			self._73 = [self._73, deferred]
		} else {
			self._73.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._58 = function () {
	var self = this
	while (self._97 & 4) {
		self = self._27
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._97 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._5 = self._5 // @[/development]
			if (isFulfilled) {
				deferred.promise._41(self._27)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._53(self._27)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.setContext(self, deferred) // @[/development]
			var ret = tryCallOne__c9d565ea_0267_11e6_8d22_5e5517507c66(cb, self._27)
			LST.releaseContext() // @[/development]
			if (ret === IS_ERROR) {
				deferred.promise._53(LAST_ERROR)
			} else {
				deferred.promise._41(ret)
			}
		}
	})
}

function finale(self) {
	if (self._97 & 8) {
		self._87(self._73)
		self._73 = null
	} else if (self._97 & 16) {
		var deferreds = self._73
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._87(deferreds[i])
		}
		self._73 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._97 & 32)) {
			if (Promise.suppressUnhandledRejections) {
				var originalError = console.error
				console.error = function () {console.error = originalError}
			}
			console.error(
				clc.red( // @[/node]
					'Unhandled rejection'
					+ ' ' + String(reason) + '\n' + self._5.getTrace() // @[/development]
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
