'use strict'
var Promise = require('./promise')
var task = require('./task').init(handleSettled, onUnhandledRejection)
var console = require('./util').console // @[/browser]
var INTERNAL = require('./util').INTERNAL
var warn = require('./warn') // @[/development]
var LST = require('./long-stack-traces') // @[/development]
var PASSTHROUGH_REJECTION = false // @[/development]

// This is the .then() method used by all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._0 = function (onFulfilled, onRejected) {
	var promise = new Promise(INTERNAL)
	promise._55(2) // @[/development]
	this._32(onFulfilled, onRejected, promise)
	return promise
}

// This is used instead of new Promise(handler), for all internal functions.
// It automatically captures stack traces at the correct depth.
Promise.prototype._59 = function (handler) {
	this._55(2) // @[/development]
	var ret = tryCallTwo(handler, this._93(), this._33())
	if (ret === IS_ERROR) {
		this._15(LAST_ERROR)
	}
	return this
}

Promise.prototype._93 = function () {
	var self = this
	return function (value) {self._56(value)}
}
Promise.prototype._33 = function () {
	var self = this
	return function (reason) {self._15(reason)}
}

Promise.prototype._56 = function (newValue) {
	if (this._87 & 7) {
		return
	}
	if (newValue === this) {
		return this._15(new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return this._15(LAST_ERROR)
		}
		if (typeof then === 'function') {
			this._87 |= 4
			this._82 = newValue instanceof Promise ? newValue : foreignPromise(newValue, then)
			if (this._87 & 24) {
				finale(this)
			} else if (this._87 & 32) {
				this._77()._87 |= 32
			}
			return
		}
	}
	this._87 |= 1
	this._82 = newValue
	finale(this)
}
Promise.prototype._15 = function (newValue) {
	if (this._87 & 7) {
		LST.useRejectionStack() // @[/development]
		return
	}
	this._87 |= 2
	this._82 = newValue
	
	if (!PASSTHROUGH_REJECTION && !(newValue instanceof Error)) {
		var type = newValue === null ? 'null' :
			typeof newValue === 'object' ? Object.prototype.toString.call(newValue) :
			typeof newValue
		warn('A promise was rejected with a non-error: ' + type, this._1)
	}
	this._1 = LST.useRejectionStack() || this._1
	this._80(newValue)
	
	if (!(this._87 & 32)) {
		task(true, this, newValue)
	}
	finale(this)
}

Promise.prototype._32 = function (onFulfilled, onRejected, promise) {
	if (typeof onFulfilled !== 'function' && onFulfilled != null) {
		warn('Promise handlers must be functions (' + typeof onFulfilled + 's will be ignored).', promise._1)
	}
	if (typeof onRejected !== 'function' && onRejected != null) {
		warn('Promise handlers must be functions (' + typeof onRejected + 's will be ignored).', promise._1)
	}
	return this._72({
		onFulfilled: typeof onFulfilled === 'function' ? onFulfilled : null,
		onRejected: typeof onRejected === 'function' ? onRejected : null,
		promise: promise
	})
}
Promise.prototype._72 = function (deferred) {
	var self = this._77()
	var state = self._87
	if (!(state & 32)) {
		self._87 |= 32
	}
	if (!(state & 3)) {
		if (!(state & 24)) {
			self._87 |= 8
			self._23 = deferred
		} else if (state & 8) {
			self._87 = state & ~8 | 16
			self._23 = [self._23, deferred]
		} else {
			self._23.push(deferred)
		}
	} else {
		task(false, self, deferred)
	}
}
Promise.prototype._77 = function () {
	var self = this
	while (self._87 & 4) {
		self = self._82
	}
	return self
}

function finale(self) {
	if (self._87 & 8) {
		self._72(self._23)
		self._23 = null
	} else if (self._87 & 16) {
		var deferreds = self._23
		for (var i=0, len=deferreds.length; i<len; i++) {
			self._72(deferreds[i])
		}
		self._23 = null
	}
}

function handleSettled(deferred) {
	var isFulfilled = this._87 & 1
	var cb = isFulfilled ? deferred.onFulfilled : deferred.onRejected
	if (cb === null) {
		deferred.promise._1 = this._1 // @[/development]
		if (isFulfilled) {
			deferred.promise._56(this._82)
		} else {
			PASSTHROUGH_REJECTION = true // @[/development]
			deferred.promise._15(this._82)
			PASSTHROUGH_REJECTION = false // @[/development]
		}
	} else {
		LST.setContext(this, deferred) // @[/development]
		var ret = tryCallOne(cb, this._82)
		LST.releaseContext() // @[/development]
		if (ret === IS_ERROR) {
			deferred.promise._15(LAST_ERROR)
		} else {
			deferred.promise._56(ret)
		}
	}
}

function onUnhandledRejection(reason) {
	if (!(this._87 & 32)) {
		if (Promise.suppressUnhandledRejections) {
			var originalError = console.error
			console.error = function () {console.error = originalError}
		}
		console.error(
				'Unhandled rejection'
				+ ' ' + String(reason) + '\n' + this._1.getTrace() // @[/development]
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
