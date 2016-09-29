'use strict'
var Promise = require('./promise')
var task = require('./task').init(handleSettled, onUnhandledRejection)
var clc = require('cli-color') // @[/node]
var INTERNAL = require('./util').INTERNAL
var warn = require('./warn') // @[/development]
var LST = require('./long-stack-traces') // @[/development]
var PASSTHROUGH_REJECTION = false // @[/development]

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._67 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._83(2) // @[/development]
	this._88(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._23 = function (handler) {
	this._83(2) // @[/development]
	var ret = tryCallTwo(handler, this._78(), this._66())
	if (ret === IS_ERROR) {
		this._59(LAST_ERROR)
	}
	return this
}

Promise.prototype._78 = function () {
	var self = this
	return function (value) {self._89(value)}
}
Promise.prototype._66 = function () {
	var self = this
	return function (reason) {self._59(reason)}
}

Promise.prototype._89 = function (newValue) {
	if (this._56 & 7) {
		return
	}
	if (newValue === this) {
		return this._59(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._59(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._56 |= 4
			this._60 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._56 & 24) {
				finale(this)
			} else if (this._56 & 32) {
				this._73()._56 |= 32
			}
			return
		}
	}
	this._56 |= 1
	this._60 = newValue
	finale(this)
}
Promise.prototype._59 = function (newValue) {
	if (this._56 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._56 |= 2
	this._60 = newValue
	
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? 'null' :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type, this._49)
	}
	this._49 = LST.useRejectionStack() || this._49
	this._97(newValue)
	
	if (!(this._56 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._88 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).', promise._49)
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).', promise._49)
	}
	return this._5({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._5 = function (deferred) {
	var self = this._73()
	var state = self._56
	if (!(state & 32)) {
		self._56 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._56 |= 8
			self._16 = deferred
		} else if (state & 8) {
			self._56 = state & ~8 | 16
			self._16 = [self._16, deferred]
		} else {
			self._16.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._73 = function () {
	var self = this
	while (self._56 & 4) {
		self = self._60
	}
	return self
}

function finale(self) {
	if (self._56 & 8) {
		self._5(self._16)
		self._16 = null
	} else if (self._56 & 16) {
		var deferreds = self._16
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._5(deferreds[i])
		}
		self._16 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._56 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		deferred.promise._49 = this._49 // @[/development]
		if (isFulfilled) {
			deferred.promise._89(this._60)
		} else {
			PASSTHROUGH_REJECTION = true // @[/development]
			deferred.promise._59(this._60)
			PASSTHROUGH_REJECTION = false // @[/development]
		}
	} else {
		LST.setContext(this, deferred) // @[/development]
		var ret = tryCallOne(cb, this._60)
		LST.releaseContext() // @[/development]
		if (ret === IS_ERROR) {
			deferred.promise._59(LAST_ERROR)
		} else {
			deferred.promise._89(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._56 & 32)) {
		if (Promise.suppressUnhandledRejections) {
			var originalError = console.error
			console.error = function () {console.error = originalError}
		}
		console.error(
			clc.red( // @[/node]
				'Unhandled rejection'
				+ ' ' + String(reason) + '\n' + this._49.getTrace() // @[/development]
			) // @[/node]
		)
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
function tryCallOne(fn, a) {
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
