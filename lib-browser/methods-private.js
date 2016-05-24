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
Promise.prototype._80 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._70(2) // @[/development]
	this._58(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._27 = function (handler) {
	this._70(2) // @[/development]
	var ret = tryCallTwo__c9d565ea_0267_11e6_8d22_5e5517507c66(handler, this._69(), this._5())
	if (ret === IS_ERROR) {
		this._64(LAST_ERROR)
	}
	return this
}

Promise.prototype._69 = function () {
	var self = this
	return function (value) {self._36(value)}
}
Promise.prototype._5 = function () {
	var self = this
	return function (reason) {self._64(reason)}
}

Promise.prototype._36 = function (newValue) {
	if (this._95 & 7) {
		return
	}
	if (newValue === this) {
		return this._64(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen__c9d565ea_0267_11e6_8d22_5e5517507c66(newValue)
		if (then === IS_ERROR) {
			return this._64(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._95 |= 4
			this._88 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._95 & 24) {
				finale(this)
			} else if (this._95 & 32) {
				this._68()._95 |= 32
			}
			return
		}
	}
	this._95 |= 1
	this._88 = newValue
	finale(this)
}
Promise.prototype._64 = function (newValue) {
	if (this._95 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._95 |= 2
	this._88 = newValue
	
	this._67 = LST.useRejectionStack() || this._67
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	this._84(newValue)
	
	if (!(this._95 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._58 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).')
	}
	return this._60({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._60 = function (deferred) {
	var self = this._68()
	var state = self._95
	if (!(state & 32)) {
		self._95 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._95 |= 8
			self._77 = deferred
		} else if (state & 8) {
			self._95 = state & ~8 | 16
			self._77 = [self._77, deferred]
		} else {
			self._77.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._68 = function () {
	var self = this
	while (self._95 & 4) {
		self = self._88
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._95 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._67 = self._67 // @[/development]
			if (isFulfilled) {
				deferred.promise._36(self._88)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._64(self._88)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.setContext(self, deferred) // @[/development]
			var ret = tryCallOne__c9d565ea_0267_11e6_8d22_5e5517507c66(cb, self._88)
			LST.releaseContext() // @[/development]
			if (ret === IS_ERROR) {
				deferred.promise._64(LAST_ERROR)
			} else {
				deferred.promise._36(ret)
			}
		}
	})
}

function finale(self) {
	if (self._95 & 8) {
		self._60(self._77)
		self._77 = null
	} else if (self._95 & 16) {
		var deferreds = self._77
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._60(deferreds[i])
		}
		self._77 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._95 & 32)) {
			if (Promise.suppressUnhandledRejections) {
				var originalError = console.error
				console.error = function () {console.error = originalError}
			}
			console.error(
					'Unhandled rejection'
					+ ' ' + String(reason) + '\n' + self._67.getTrace() // @[/development]
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
