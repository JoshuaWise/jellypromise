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
Promise.prototype._42 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._50(2) // @[/development]
	this._8(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._82 = function (handler) {
	this._50(2) // @[/development]
	var ret = tryCallTwo__c9d565ea_0267_11e6_8d22_5e5517507c66(handler, this._88(), this._94())
	if (ret === IS_ERROR) {
		this._71(LAST_ERROR)
	}
	return this
}

Promise.prototype._88 = function () {
	var self = this
	return function (value) {self._58(value)}
}
Promise.prototype._94 = function () {
	var self = this
	return function (reason) {self._71(reason)}
}

Promise.prototype._58 = function (newValue) {
	if (this._34 & 7) {
		return
	}
	if (newValue === this) {
		return this._71(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen__c9d565ea_0267_11e6_8d22_5e5517507c66(newValue)
		if (then === IS_ERROR) {
			return this._71(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._34 |= 4
			this._32 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._34 & 24) {
				finale(this)
			} else if (this._34 & 32) {
				this._36()._34 |= 32
			}
			return
		}
	}
	this._34 |= 1
	this._32 = newValue
	finale(this)
}
Promise.prototype._71 = function (newValue) {
	if (this._34 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._34 |= 2
	this._32 = newValue
	
	this._33 = LST.useRejectionStack() || this._33
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	this._92(newValue)
	
	if (!(this._34 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._8 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).')
	}
	return this._43({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._43 = function (deferred) {
	var self = this._36()
	var state = self._34
	if (!(state & 32)) {
		self._34 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._34 |= 8
			self._74 = deferred
		} else if (state & 8) {
			self._34 = state & ~8 | 16
			self._74 = [self._74, deferred]
		} else {
			self._74.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._36 = function () {
	var self = this
	while (self._34 & 4) {
		self = self._32
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._34 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._33 = self._33 // @[/development]
			if (isFulfilled) {
				deferred.promise._58(self._32)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._71(self._32)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.setContext(self, deferred) // @[/development]
			var ret = tryCallOne__c9d565ea_0267_11e6_8d22_5e5517507c66(cb, self._32)
			LST.releaseContext() // @[/development]
			if (ret === IS_ERROR) {
				deferred.promise._71(LAST_ERROR)
			} else {
				deferred.promise._58(ret)
			}
		}
	})
}

function finale(self) {
	if (self._34 & 8) {
		self._43(self._74)
		self._74 = null
	} else if (self._34 & 16) {
		var deferreds = self._74
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._43(deferreds[i])
		}
		self._74 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._34 & 32)) {
			if (Promise.suppressUnhandledRejections) {
				var originalError = console.error
				console.error = function () {console.error = originalError}
			}
			console.error(
				clc.red( // @[/node]
					'Unhandled rejection'
					+ ' ' + String(reason) + '\n' + self._33.getTrace() // @[/development]
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
