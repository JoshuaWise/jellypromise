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
Promise.prototype._0 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._91(2) // @[/development]
	this._87(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._32 = function (handler) {
	this._91(2) // @[/development]
	var ret = tryCallTwo(handler, this._13(), this._2())
	if (ret === IS_ERROR) {
		this._80(LAST_ERROR)
	}
	return this
}

Promise.prototype._13 = function () {
	var self = this
	return function (value) {self._17(value)}
}
Promise.prototype._2 = function () {
	var self = this
	return function (reason) {self._80(reason)}
}

Promise.prototype._17 = function (newValue) {
	if (this._70 & 7) {
		return
	}
	if (newValue === this) {
		return this._80(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._80(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._70 |= 4
			this._22 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._70 & 24) {
				finale(this)
			} else if (this._70 & 32) {
				this._45()._70 |= 32
			}
			return
		}
	}
	this._70 |= 1
	this._22 = newValue
	finale(this)
}
Promise.prototype._80 = function (newValue) {
	if (this._70 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._70 |= 2
	this._22 = newValue
	
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? 'null' :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type, this._20)
	}
	this._20 = LST.useRejectionStack() || this._20
	this._1(newValue)
	
	if (!(this._70 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._87 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).', promise._20)
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).', promise._20)
	}
	return this._58({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._58 = function (deferred) {
	var self = this._45()
	var state = self._70
	if (!(state & 32)) {
		self._70 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._70 |= 8
			self._63 = deferred
		} else if (state & 8) {
			self._70 = state & ~8 | 16
			self._63 = [self._63, deferred]
		} else {
			self._63.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._45 = function () {
	var self = this
	while (self._70 & 4) {
		self = self._22
	}
	return self
}

function finale(self) {
	if (self._70 & 8) {
		self._58(self._63)
		self._63 = null
	} else if (self._70 & 16) {
		var deferreds = self._63
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._58(deferreds[i])
		}
		self._63 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._70 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		deferred.promise._20 = this._20 // @[/development]
		if (isFulfilled) {
			deferred.promise._17(this._22)
		} else {
			PASSTHROUGH_REJECTION = true // @[/development]
			deferred.promise._80(this._22)
			PASSTHROUGH_REJECTION = false // @[/development]
		}
	} else {
		LST.setContext(this, deferred) // @[/development]
		var ret = tryCallOne(cb, this._22)
		LST.releaseContext() // @[/development]
		if (ret === IS_ERROR) {
			deferred.promise._80(LAST_ERROR)
		} else {
			deferred.promise._17(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._70 & 32)) {
		if (Promise.suppressUnhandledRejections) {
			var originalError = console.error
			console.error = function () {console.error = originalError}
		}
		console.error(
			clc.red( // @[/node]
				'Unhandled rejection'
				+ ' ' + String(reason) + '\n' + this._20.getTrace() // @[/development]
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
