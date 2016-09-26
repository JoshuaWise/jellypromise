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
Promise.prototype._69 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._53(2) // @[/development]
	this._10(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._16 = function (handler) {
	this._53(2) // @[/development]
	var ret = tryCallTwo(handler, this._30(), this._73())
	if (ret === IS_ERROR) {
		this._86(LAST_ERROR)
	}
	return this
}

Promise.prototype._30 = function () {
	var self = this
	return function (value) {self._61(value)}
}
Promise.prototype._73 = function () {
	var self = this
	return function (reason) {self._86(reason)}
}

Promise.prototype._61 = function (newValue) {
	if (this._88 & 7) {
		return
	}
	if (newValue === this) {
		return this._86(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._86(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._88 |= 4
			this._63 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._88 & 24) {
				finale(this)
			} else if (this._88 & 32) {
				this._80()._88 |= 32
			}
			return
		}
	}
	this._88 |= 1
	this._63 = newValue
	finale(this)
}
Promise.prototype._86 = function (newValue) {
	if (this._88 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._88 |= 2
	this._63 = newValue
	
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? 'null' :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type, this._94)
	}
	this._94 = LST.useRejectionStack() || this._94
	this._70(newValue)
	
	if (!(this._88 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._10 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).', promise._94)
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).', promise._94)
	}
	return this._26({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._26 = function (deferred) {
	var self = this._80()
	var state = self._88
	if (!(state & 32)) {
		self._88 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._88 |= 8
			self._33 = deferred
		} else if (state & 8) {
			self._88 = state & ~8 | 16
			self._33 = [self._33, deferred]
		} else {
			self._33.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._80 = function () {
	var self = this
	while (self._88 & 4) {
		self = self._63
	}
	return self
}

function finale(self) {
	if (self._88 & 8) {
		self._26(self._33)
		self._33 = null
	} else if (self._88 & 16) {
		var deferreds = self._33
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._26(deferreds[i])
		}
		self._33 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._88 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		deferred.promise._94 = this._94 // @[/development]
		if (isFulfilled) {
			deferred.promise._61(this._63)
		} else {
			PASSTHROUGH_REJECTION = true // @[/development]
			deferred.promise._86(this._63)
			PASSTHROUGH_REJECTION = false // @[/development]
		}
	} else {
		LST.setContext(this, deferred) // @[/development]
		var ret = tryCallOne(cb, this._63)
		LST.releaseContext() // @[/development]
		if (ret === IS_ERROR) {
			deferred.promise._86(LAST_ERROR)
		} else {
			deferred.promise._61(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._88 & 32)) {
		if (Promise.suppressUnhandledRejections) {
			var originalError = console.error
			console.error = function () {console.error = originalError}
		}
		console.error(
			clc.red( // @[/node]
				'Unhandled rejection'
				+ ' ' + String(reason) + '\n' + this._94.getTrace() // @[/development]
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
