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
Promise.prototype._87 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._61(2) // @[/development]
	this._3(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._67 = function (handler) {
	this._61(2) // @[/development]
	var ret = tryCallTwo__c9d565ea_0267_11e6_8d22_5e5517507c66(handler, this._69(), this._77())
	if (ret === IS_ERROR) {
		this._15(LAST_ERROR)
	}
	return this
}

Promise.prototype._69 = function () {
	var self = this
	return function (value) {self._20(value)}
}
Promise.prototype._77 = function () {
	var self = this
	return function (reason) {self._15(reason)}
}

Promise.prototype._20 = function (newValue) {
	if (this._76 & 7) {
		return
	}
	if (newValue === this) {
		return this._15(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen__c9d565ea_0267_11e6_8d22_5e5517507c66(newValue)
		if (then === IS_ERROR) {
			return this._15(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._76 |= 4
			this._84 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._76 & 24) {
				finale(this)
			} else if (this._76 & 32) {
				this._2()._76 |= 32
			}
			return
		}
	}
	this._76 |= 1
	this._84 = newValue
	finale(this)
}
Promise.prototype._15 = function (newValue) {
	if (this._76 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._76 |= 2
	this._84 = newValue
	
	this._32 = LST.useRejectionStack() || this._32
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	this._5(newValue)
	
	if (!(this._76 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._3 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).')
	}
	return this._78({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._78 = function (deferred) {
	var self = this._2()
	var state = self._76
	if (!(state & 32)) {
		self._76 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._76 |= 8
			self._41 = deferred
		} else if (state & 8) {
			self._76 = state & ~8 | 16
			self._41 = [self._41, deferred]
		} else {
			self._41.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._2 = function () {
	var self = this
	while (self._76 & 4) {
		self = self._84
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._76 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._32 = self._32 // @[/development]
			if (isFulfilled) {
				deferred.promise._20(self._84)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._15(self._84)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.setContext(self, deferred) // @[/development]
			var ret = tryCallOne__c9d565ea_0267_11e6_8d22_5e5517507c66(cb, self._84)
			LST.releaseContext() // @[/development]
			if (ret === IS_ERROR) {
				deferred.promise._15(LAST_ERROR)
			} else {
				deferred.promise._20(ret)
			}
		}
	})
}

function finale(self) {
	if (self._76 & 8) {
		self._78(self._41)
		self._41 = null
	} else if (self._76 & 16) {
		var deferreds = self._41
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._78(deferreds[i])
		}
		self._41 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._76 & 32)) {
			if (Promise.suppressUnhandledRejections) {
				var originalError = console.error
				console.error = function () {console.error = originalError}
			}
			console.error(
					'Unhandled rejection'
					+ ' ' + String(reason) + '\n' + self._32.getTrace() // @[/development]
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
