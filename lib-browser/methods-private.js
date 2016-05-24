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
Promise.prototype._73 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._26(2) // @[/development]
	this._74(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._2 = function (handler) {
	this._26(2) // @[/development]
	var ret = tryCallTwo__c9d565ea_0267_11e6_8d22_5e5517507c66(handler, this._21(), this._20())
	if (ret === IS_ERROR) {
		this._75(LAST_ERROR)
	}
	return this
}

Promise.prototype._21 = function () {
	var self = this
	return function (value) {self._36(value)}
}
Promise.prototype._20 = function () {
	var self = this
	return function (reason) {self._75(reason)}
}

Promise.prototype._36 = function (newValue) {
	if (this._67 & 7) {
		return
	}
	if (newValue === this) {
		return this._75(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen__c9d565ea_0267_11e6_8d22_5e5517507c66(newValue)
		if (then === IS_ERROR) {
			return this._75(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._67 |= 4
			this._42 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._67 & 24) {
				finale(this)
			} else if (this._67 & 32) {
				this._40()._67 |= 32
			}
			return
		}
	}
	this._67 |= 1
	this._42 = newValue
	finale(this)
}
Promise.prototype._75 = function (newValue) {
	if (this._67 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._67 |= 2
	this._42 = newValue
	
	this._39 = LST.useRejectionStack() || this._39
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	this._25(newValue)
	
	if (!(this._67 & 32)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._74 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).')
	}
	return this._61({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._61 = function (deferred) {
	var self = this._40()
	var state = self._67
	if (!(state & 32)) {
		self._67 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._67 |= 8
			self._82 = deferred
		} else if (state & 8) {
			self._67 = state & ~8 | 16
			self._82 = [self._82, deferred]
		} else {
			self._82.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}
Promise.prototype._40 = function () {
	var self = this
	while (self._67 & 4) {
		self = self._42
	}
	return self
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._67 & 1
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._39 = self._39 // @[/development]
			if (isFulfilled) {
				deferred.promise._36(self._42)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._75(self._42)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.setContext(self, deferred) // @[/development]
			var ret = tryCallOne__c9d565ea_0267_11e6_8d22_5e5517507c66(cb, self._42)
			LST.releaseContext() // @[/development]
			if (ret === IS_ERROR) {
				deferred.promise._75(LAST_ERROR)
			} else {
				deferred.promise._36(ret)
			}
		}
	})
}

function finale(self) {
	if (self._67 & 8) {
		self._61(self._82)
		self._82 = null
	} else if (self._67 & 16) {
		var deferreds = self._82
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._61(deferreds[i])
		}
		self._82 = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._67 & 32)) {
			if (Promise.suppressUnhandledRejections) {
				var originalError = console.error
				console.error = function () {console.error = originalError}
			}
			console.error(
					'Unhandled rejection'
					+ ' ' + String(reason) + '\n' + self._39.getTrace() // @[/development]
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
