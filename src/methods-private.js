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
Promise.prototype._then = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._addStackTrace(2) // @[/development]
	this._handleNew(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._resolveFromHandler = function (handler) {
	this._addStackTrace(2) // @[/development]
	var ret = tryCallTwo(handler, this._resolver(), this._rejector())
	if (ret === IS_ERROR) {
		this._addStackTraceFromError(LAST_ERROR) // @[/development]
		this._reject(LAST_ERROR)
	}
	return this
}

Promise.prototype._resolver = function () {
	var self = this
	return function (value) {self._resolve(value)}
}
Promise.prototype._rejector = function () {
	var self = this
	return function (reason) {self._reject(reason)}
}

Promise.prototype._resolve = function (newValue) {
	if (this._state & $IS_RESOLVED) {
		return
	}
	if (newValue === this) {
		return this._reject(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue != null && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			this._addStackTraceFromError(LAST_ERROR) // @[/development]
			return this._reject(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._state |= $IS_FOLLOWING
			this._value = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			finale(this)
			return
		}
	}
	this._state |= $IS_FULFILLED
	this._value = newValue
	finale(this)
}
Promise.prototype._reject = function (newValue) {
	if (this._state & $IS_RESOLVED) {
		return
	}
	this._state |= $IS_REJECTED
	this._value = newValue
	
	// @[development]
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? null :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type)
	}
	this._addStackTraceFromError(newValue)
	// @[/]
	
	if (!(this._state & $SUPRESS_UNHANDLED_REJECTIONS)) {
		asap(onUnhandledRejection(this, newValue))
	}
	finale(this)
}

Promise.prototype._handleNew = function (onFulfilled, onRejected, promise) {
	// @[development]
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).')
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).')
	}
	// @[/]
	return this._handle({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._handle = function (deferred) {
	var self = this
	while (self._state & $IS_FOLLOWING) {
		self = self._value
	}
	var state = self._state
	if (!(state & $SUPRESS_UNHANDLED_REJECTIONS)) {
		self._state |= $SUPRESS_UNHANDLED_REJECTIONS
	}
	if (!(state & $IS_FINAL)) {
		if (!(state & $HAS_SOME_HANDLER)) {
			self._state |= $SINGLE_HANDLER
			self._deferreds = deferred
		} else if (state & $SINGLE_HANDLER) {
			self._state = state & ~$SINGLE_HANDLER | $MANY_HANDLERS
			self._deferreds = [self._deferreds, deferred]
		} else {
			self._deferreds.push(deferred)
		}
	} else {
		handleSettled(self, deferred)
	}
}

function handleSettled(self, deferred) {
	asap(function () {
		var isFulfilled = self._state & $IS_FULFILLED
		var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			deferred.promise._trace = self._trace // @[/development]
			if (isFulfilled) {
				deferred.promise._resolve(self._value)
			} else {
				PASSTHROUGH_REJECTION = true // @[/development]
				deferred.promise._reject(self._value)
				PASSTHROUGH_REJECTION = false // @[/development]
			}
		} else {
			LST.currentStack = deferred.promise._trace // @[/development]
			var ret = tryCallOne_$(cb, self._value)
			// @[development]
			LST.currentStack = null
			if (LST.traceOverride) {
				deferred.promise._trace = LST.traceOverride
				LST.traceOverride = null
			}
			// @[/]
			if (ret === IS_ERROR) {
				deferred.promise._addStackTraceFromError(LAST_ERROR) // @[/development]
				deferred.promise._reject(LAST_ERROR)
			} else {
				deferred.promise._resolve(ret)
			}
		}
	})
}

function finale(self) {
	if (self._state & $SINGLE_HANDLER) {
		self._handle(self._deferreds)
		self._deferreds = null
	} else if (self._state & $MANY_HANDLERS) {
		var deferreds = self._deferreds
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._handle(deferreds[i])
		}
		self._deferreds = null
	}
}

function onUnhandledRejection(self, reason) {
	return function () {
		if (!(self._state & $SUPRESS_UNHANDLED_REJECTIONS)) {
			console.error(
				clc.red( // @[/node]
					'Unhandled rejection '
					+ (String(reason) + '\n' + self._trace.getTrace().join('\n')) // @[/development]
					+ (reason instanceof Error && reason.stack || String(reason)) // @[/production]
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
function tryCallOne_$(fn, a) {
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
