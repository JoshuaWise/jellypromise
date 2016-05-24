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
Promise.prototype._47 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._56(2) // @[/development]
	this._90(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._80 = function (handler) {
	this._56(2) // @[/development]
	var ret = tryCallTwo__c9d565ea_0267_11e6_8d22_5e5517507c66(handler, this._1(), this._96())
	if (ret === IS_ERROR) {
		this._12(LAST_ERROR)
	}
	return this
}

Promise.prototype._1 = function () {
	var self = this
	return function (value) {self._33(value)}
}
Promise.prototype._96 = function () {
	var self = this
	return function (reason) {self._12(reason)}
}

Promise.prototype._33 = function (newValue) {
	if (this._91 & 7) {
		return
	}
	if (newValue === this) {
		return this._12(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen__c9d565ea_0267_11e6_8d22_5e5517507c66(newValue)
		if (then === IS_ERROR) {
			return this._12(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._91 |= 4
			this._48 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._91 & 24) {
				finale(this)
			} else if (this._91 & 32) {
				this._63()._91 |= 32
			}
			return
		}
	}
	this._91 |= 1
	this._48 = newValue
	finale(this)
}
Promise.prototype._12 = function (newValue) {
	if (this._91 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._91 |= 2
	this._48 = newValue
	
	this._44 = LST.useRejectionStack() || this._44
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	this._76(newValue)
	
	if (!(this._91 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._90 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).')
	}
	return this._36({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._36 = function (deferred) {
	var self = this._63()
	var state = self._91
	if (!(state & 32)) {
		self._91 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._91 |= 8
			self._4 = deferred
		} else if (state & 8) {
			self._91 = state & ~8 | 16
			self._4 = [self._4, deferred]
		} else {
			self._4.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._63 = function () {
	var self = this
	while (self._91 & 4) {
		self = self._48
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._91 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._44 = self._44 // @[/development]
			if (isFulfilled) {
				deferred.promise._33(self._48)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._12(self._48)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.setContext(self, deferred) // @[/development]
			var ret = tryCallOne__c9d565ea_0267_11e6_8d22_5e5517507c66(cb, self._48)
			LST.releaseContext() // @[/development]
			if (ret === IS_ERROR) {
				deferred.promise._12(LAST_ERROR)
			} else {
				deferred.promise._33(ret)
			}
		}
	})
}

function finale(self) {
	if (self._91 & 8) {
		self._36(self._4)
		self._4 = null
	} else if (self._91 & 16) {
		var deferreds = self._4
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._36(deferreds[i])
		}
		self._4 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._91 & 32)) {
			if (Promise.suppressUnhandledRejections) {
				var originalError = console.error
				console.error = function () {console.error = originalError}
			}
			console.error(
				clc.red( // @[/node]
					'Unhandled rejection'
					+ ' ' + String(reason) + '\n' + self._44.getTrace() // @[/development]
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
