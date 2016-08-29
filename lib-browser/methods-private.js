'use strict'
var Promise = require('./promise')
var asap = require('asap/raw')
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL
var warn = require('./warn') // @[/development]
var LST = require('./long-stack-traces') // @[/development]
var PASSTHROUGH_REJECTION = false // @[/development]

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._85 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._78(2) // @[/development]
	this._42(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._84 = function (handler) {
	this._78(2) // @[/development]
	var ret = tryCallTwo__c9d565ea_0267_11e6_8d22_5e5517507c66(handler, this._75(), this._44())
	if (ret === IS_ERROR) {
		this._95(LAST_ERROR)
	}
	return this
}

Promise.prototype._75 = function () {
	var self = this
	return function (value) {self._17(value)}
}
Promise.prototype._44 = function () {
	var self = this
	return function (reason) {self._95(reason)}
}

Promise.prototype._17 = function (newValue) {
	if (this._24 & 7) {
		return
	}
	if (newValue === this) {
		return this._95(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen__c9d565ea_0267_11e6_8d22_5e5517507c66(newValue)
		if (then === IS_ERROR) {
			return this._95(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._24 |= 4
			this._1 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._24 & 24) {
				finale(this)
			} else if (this._24 & 32) {
				this._21()._24 |= 32
			}
			return
		}
	}
	this._24 |= 1
	this._1 = newValue
	finale(this)
}
Promise.prototype._95 = function (newValue) {
	if (this._24 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._24 |= 2
	this._1 = newValue
	
	this._40 = LST.useRejectionStack() || this._40
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	this._11(newValue)
	
	if (!(this._24 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._42 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).')
	}
	return this._31({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._31 = function (deferred) {
	var self = this._21()
	var state = self._24
	if (!(state & 32)) {
		self._24 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._24 |= 8
			self._99 = deferred
		} else if (state & 8) {
			self._24 = state & ~8 | 16
			self._99 = [self._99, deferred]
		} else {
			self._99.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._21 = function () {
	var self = this
	while (self._24 & 4) {
		self = self._1
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._24 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._40 = self._40 // @[/development]
			if (isFulfilled) {
				deferred.promise._17(self._1)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._95(self._1)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.setContext(self, deferred) // @[/development]
			var ret = tryCallOne__c9d565ea_0267_11e6_8d22_5e5517507c66(cb, self._1)
			LST.releaseContext() // @[/development]
			if (ret === IS_ERROR) {
				deferred.promise._95(LAST_ERROR)
			} else {
				deferred.promise._17(ret)
			}
		}
	})
}

function finale(self) {
	if (self._24 & 8) {
		self._31(self._99)
		self._99 = null
	} else if (self._24 & 16) {
		var deferreds = self._99
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._31(deferreds[i])
		}
		self._99 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._24 & 32)) {
			if (Promise.suppressUnhandledRejections) {
				var originalError = console.error
				console.error = function () {console.error = originalError}
			}
			console.error(
					'Unhandled rejection'
					+ ' ' + String(reason) + '\n' + self._40.getTrace() // @[/development]
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
