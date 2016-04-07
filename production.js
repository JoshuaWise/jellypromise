(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict'
var productionModulePath = './production'




	module.exports = require('./lib/core')
	require('./lib/utilities')
	require('./lib/node-extensions')



},{"./lib/core":2,"./lib/long-stack-traces":4,"./lib/node-extensions":5,"./lib/utilities":9}],2:[function(require,module,exports){
'use strict'
var asap = require('asap/raw')
var toArray = require('./to-array')

function noop() {}

// States:
// 0 = pending
// 1 = fulfilled with _value
// 2 = rejected with _value
// 3 = adopted the state of another promise, _value
// Once the state is no longer pending (0) it is immutable.
function Promise(fn) {
	if (typeof this !== 'object') {
		throw new TypeError('Promises must be constructed via the "new" keyword.')
	}
	if (typeof fn !== 'function') {
		throw new TypeError('Promises must be constructed with a function argument.')
	}
	this._13 = 0
	this._93 = null
	this._16 = null
	this._83 = 0
	this._14 = false
	if (fn !== noop) {
		resolveOrReject(this, fn)
	}
}
Promise.prototype.then = function (onFulfilled, onRejected) {
	var res = new Promise(noop)
	handle(this, new Deferred(onFulfilled, onRejected, res))
	return res
}
Promise.prototype.catch = function (onRejected) {
	var len = arguments.length
	if (len === 2) {
		var type = onRejected
		onRejected = arguments[1]
		return this.then(null, function (reason) {
			if (catchType(type, reason)) {
				return onRejected(reason)
			}
			throw reason
		})
	} else if (len > 2) {
		var args = new Array(--len)
		for (var i=0; i<len; i++) {
			args[i] = arguments[i]
		}
		onRejected = arguments[i]
		return this.then(null, function (reason) {
			for (var i=0; i<len; i++) {
				if (catchType(args[i], reason)) {
					return onRejected(reason)
				}
			}
			throw reason
		})
	}
	return this.then(null, onRejected)
}
Promise.prototype.catchLater = function () {
	this._14 = true
	return this
}
module.exports = Promise
Promise.resolve = function (value) {
	if (value instanceof Promise) {
		return value
	}
	var promise = new Promise(noop)
	resolve(promise, value)
	return promise
}
Promise.reject = function (reason) {
	var promise = new Promise(noop)
	reject(promise, reason)
	return promise
}
Promise.race = function (iterable) {
	var arr = toArray(iterable)
	return new Promise(function (res, rej) {
		for (var i=0, len=arr.length; i<len; i++) {
			Promise.resolve(arr[i]).then(res, rej)
		}
	})
}
Promise.all = function (iterable) {
	var arr = toArray(iterable)
	return new Promise(function (res, rej) {
		var pendings = arr.length
		if (pendings === 0) {
			return res(arr)
		}
		arr.forEach(function (item, i) {
			Promise.resolve(item).then(function (value) {
				arr[i] = value
				if (--pendings === 0) {res(arr)}
			}, rej)
		})
	})
}

function resolveOrReject(self, fn) {
	var done = false
	var res = tryCallTwo(fn, function (value) { // resolver
		if (!done) {
			done = true
			resolve(self, value)
		}
	}, function (reason) { // rejector
		if (!done) {
			done = true
			reject(self, reason)
		}
	})
	if (!done && res === IS_ERROR) {
		done = true
		reject(self, LAST_ERROR)
	}
}
function resolve(self, newValue) {
	// Promise Resolution Procedure
	// https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
	if (newValue === self) {
		return reject(self, new TypeError('A promise cannot be resolved with itself.'))
	}
	if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
		var then = getThen(newValue)
		if (then === IS_ERROR) {
			return reject(self, LAST_ERROR)
		}
		if (then === self.then && newValue instanceof Promise) {
			// If newValue is a trusted promise, we can optimize their linkage
			// via state === 3.
			self._13 = 3
			self._93 = newValue
			finale(self)
			return
		} else if (typeof then === 'function') {
			// If newValue is some foreign promise, we have to link them
			// manually via the Promises/A+ `then` method.
			resolveOrReject(self, then.bind(newValue))
			return
		}
	}
	self._13 = 1
	self._93 = newValue
	finale(self)
}
function reject(self, newValue) {
	self._13 = 2
	self._93 = newValue
	
	// If the promise does not have a handler at the end of the current event
	// loop cycle, throw the error.
	if (!self._14) {
		asap(function () {
			if (!self._14) {
				console.error('Unhandled rejection ' + (newValue instanceof Error
					? newValue.stack || (err.name + ': ' + err.message)
					: String(newValue))
				)
			}
		})
	}
	
	finale(self)
}
function finale(self) {
	if (self._83 === 1) {
		handle(self, self._16)
		self._16 = null
	} else if (self._83 === 2) {
		var deferreds = self._16
		for (var i=0, len=deferreds.length; i<len; i++) {
			handle(self, deferreds[i])
		}
		self._16 = null
	}
}

function handle(self, deferred) {
	while (self._13 === 3) {
		self = self._93
	}
	if (!self._14) {
		self._14 = true
	}
	if (self._13 === 0) {
		if (self._83 === 0) {
			self._83 = 1
			self._16 = deferred
		} else if (self._83 === 1) {
			self._83 = 2
			self._16 = [self._16, deferred]
		} else {
			self._16.push(deferred)
		}
	} else {
		handleResolved(self, deferred)
	}
}
function handleResolved(self, deferred) {
	asap(function () {
		var cb = self._13 === 1 ? deferred.onFulfilled : deferred.onRejected
		if (cb === null) {
			if (self._13 === 1) {
				resolve(deferred.promise, self._93)
			} else {
				reject(deferred.promise, self._93)
			}
		} else {
			var ret = tryCallOne(cb, self._93)
			if (ret === IS_ERROR) {
				reject(deferred.promise, LAST_ERROR)
			} else {
				resolve(deferred.promise, ret)
			}
		}
	})
}

function Deferred(onFulfilled, onRejected, promise) {
	this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
	this.onRejected = typeof onRejected === 'function' ? onRejected : null
	this.promise = promise






}

function catchType(type, reason) {
	if (type === Error || (type && type.prototype instanceof Error)) {
		return reason instanceof type
	}
	if (typeof type === 'function') {
		return !!type(reason)
	}
	if (type && typeof type === 'object') {
		var keys = Object.keys(type)
		for (var i=0, len=keys.length; i<len; i++) {
			var key = keys[i]
			if (reason[key] != type[key]) {
				return false
			}
		}
		return true
	}
	return false
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

require('./shared').resolve = resolve
require('./shared').noop = noop

},{"./shared":6,"./to-array":8,"./warn":10,"asap/raw":11}],3:[function(require,module,exports){
'use strict'
module.exports = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol'
	? Symbol.iterator
	: undefined

},{}],4:[function(require,module,exports){
'use strict'

},{}],5:[function(require,module,exports){
'use strict'
var Promise = require('./core.js')

Promise.promisify = function (fn) {
	if (typeof fn !== 'function') {
		throw new TypeError('Expected argument to be a function.')
	}
	var likelyArgCount = Math.max(0, Math.min(1024, ~~fn.length) - 1)
	var minArgCount = Math.max(0, likelyArgCount - 3)
	var maxArgCount = Math.max(3, likelyArgCount)
	var argGuesses = [likelyArgCount]
	for (var i=likelyArgCount-1; i>=minArgCount; i--) {argGuesses.push(i)}
	for (var i=likelyArgCount+1; i<=maxArgCount; i++) {argGuesses.push(i)}
	var body = [
		'return function (' + generateArgumentList(maxArgCount).join(', ') + ') {',
			'var self = this',
			'var len = arguments.length',
			'if (len > ' + maxArgCount + ' || len < ' + minArgCount + ') {',
				'var args = new Array(len + 1)',
				'for (var i=0; i<len; i++) {args[i] = arguments[i]}',
			'}',
			'return new Promise(function (res, rej) {',
				'var cb = function (err, val) {err ? rej(err) : res(val)}',
				'switch (len) {',
					argGuesses.map(generateSwitchCase).join('\n'),
					'default:',
						'args[len] = cb',
						'fn.apply(self, args)',
				'}',
			'})',
		'}'
	].join('\n')
	return new Function(['Promise', 'fn'], body)(Promise, fn)
}
function generateArgumentList(count) {
	var args = new Array(count)
	for (var i=0; i<count; i++) {
		args[i] = 'a_' + i
	}
	return args
}
function generateSwitchCase(argLength) {
	var args = generateArgumentList(argLength)
	return [
		'case ' + argLength + ':',
			'fn.call(' + ['self'].concat(args).concat('cb').join(', ') + ')',
			'break'
	].join('\n')
}

Promise.nodeify = function (fn) {
	if (typeof fn !== 'function') {
		throw new TypeError('Expected argument to be a function.')
	}
	return function () {
		var len = arguments.length
		if (typeof arguments[len - 1] === 'function') {
			var callback = args[--len]
			var args = new Array(len)
			for (var i=0; i<len; i++) {
				args[i] = arguments[i]
			}
			fn.apply(this, args).then(function (value) {
				callback(null, value)
			}, callback)
		} else {
			fn.apply(this, arguments)
		}
	}
}

},{"./core.js":2}],6:[function(require,module,exports){

},{}],7:[function(require,module,exports){
'use strict'
function TimeoutError(message) {
	Error.call(this)
	this.message = message
	if (typeof Error.captureStackTrace === 'function') {
		Error.captureStackTrace(this, TimeoutError)
	}
}
TimeoutError.prototype = Object.create(Error.prototype)
TimeoutError.prototype.constructor = TimeoutError
TimeoutError.prototype.name = 'TimeoutError'
module.exports = TimeoutError

},{}],8:[function(require,module,exports){
'use strict'
var iterator = require('./iterator-symbol')

var toArray = module.exports = function (iterable) {
	if (typeof iterable.length === 'number') {
		return Array.prototype.slice.call(iterable)
	}
	if (iterator && typeof iterable[iterator] === 'function') {
		var arr = []
		for (var value of iterable) {arr.push(value)}
		return arr
	}
	throw new TypeError('Expected argument to be an iterable or array-like object.')
}

},{"./iterator-symbol":3}],9:[function(require,module,exports){
'use strict'
var Promise = require('./core')
var toArray = require('./to-array')
var iterator = require('./iterator-symbol')
var TimeoutError = require('./timeout-error')
var resolve = require('./shared').resolve
var noop = require('./shared').noop

Promise.prototype.finally = function (fn) {
	return this.then(function (value) {
		return Promise.resolve(fn()).then(function () {
			return value
		})
	}, function (reason) {
		return Promise.resolve(fn()).then(function () {
			throw reason
		})
	})
}
Promise.prototype.tap = function (fn) {
	return this.then(function (value) {
		return Promise.resolve(fn()).then(function () {
			return value
		})
	})
}
Promise.prototype.else = function (value) {
	if (arguments.length > 1) {
		var len = arguments.length - 1
		var args = new Array(len + 1)
		for (var i=0; i<len; i++) {
			args[i] = arguments[i]
		}
		value = arguments[i]
		args[i] = function () {return value}
		return this.catch.apply(this, args)
	}
	return this.catch(function () {return value})
}
Promise.prototype.delay = function (ms) {
	return this.then(function (value) {
		var p = new Promise(noop)
		setTimeout(function () {
			resolve(p, value)
		}, +ms)
		return p
	})
}
Promise.prototype.timeout = function (ms, reason) {
	if (reason == null) {
		reason = new TimeoutError('The operation timed out after ' + +ms + ' milliseconds.')
	} else if (!(reason instanceof Error)) {
		reason = new TimeoutError(String(reason))
	}
	var self = this
	return new Promise(function (res, rej) {
		var timer = setTimeout(function () {rej(reason)}, +ms)
		self.then(res, rej)
	})
}
Promise.any = function (iterable) {
	var arr = toArray(iterable)
	return new Promise(function (res, rej) {
		var pendings = arr.length
		if (pendings === 0) {
			throw new RangeError('Promise.any() cannot be used on an iterable with no items.')
		}
		function fail(reason) {
			if (--pendings === 0) {rej(reason)}
		}
		arr.forEach(function (item, i) {
			Promise.resolve(item).then(res, fail)
		})
	})
}
Promise.iterate = function (iterable, fn) {
	if (iterator && typeof iterable[iterator] === 'function') {
		var it = iterable[iterator]()
	} else if (typeof iterable.length === 'number') {
		var it = makeIterator(iterable)
	} else {
		throw new TypeError('Expected argument to be an iterable or array-like object.')
	}
	return new Promise(function (res, rej) {
		;(function next() {
			var item = it.next()
			item.done ? res()
				: Promise.resolve(item.value).then(fn).then(next).catch(rej)
		}())
	})
}
Promise.props = function (obj) {
	var keys = Object.keys(obj)
	var result = {}
	return new Promise(function (res, rej) {
		var pendings = keys.length
		if (pendings === 0) {
			return res(result)
		}
		keys.forEach(function (key) {
			Promise.resolve(obj[key]).then(function (value) {
				result[key] = value
				if (--pendings === 0) {res(result)}
			}, rej)
		})
	})
}
Promise.join = function (a, b, handler) {
	return new Promise(function (res, rej) {
		var halfDone = false
		var other;
		function done(value) {
			if (halfDone) {
				handler ? res(handler(a, b)) : res(a)
			} else {
				other = value
				halfDone = true
			}
		}
		Promise.resolve(a).then(done).catch(rej)
		Promise.resolve(b).then(done).catch(rej)
	})
}
Promise.partition = function (iterable) {
	var arr = toArray(iterable)
	var resolved = []
	var rejected = []
	return new Promise(function (res, rej) {
		var pendings = arr.length
		if (pendings === 0) {
			return res({resolved: resolved, rejected: rejected})
		}
		for (var i=0; i<pendings; i++) {
			Promise.resolve(arr[i]).then(pushResolved, pushRejected)
		}
		function pushResolved(value) {
			resolved.push(value)
			--pendings || res({resolved: resolved, rejected: rejected})
		}
		function pushRejected(value) {
			rejected.push(value)
			--pendings || res({resolved: resolved, rejected: rejected})
		}
	})
}
Promise.isPromise = function (value) {
	return value
		&& (typeof value === 'object' || typeof value === 'function')
		&& typeof value.then === 'function'
}
Promise.TimeoutError = TimeoutError

function makeIterator(arr) {
	var i = 0
	return {next: function () {
		return i < arr.length
			? {done: false, value: arr[i++]}
			: {done: true}
	}}
}

},{"./core":2,"./iterator-symbol":3,"./shared":6,"./timeout-error":7,"./to-array":8}],10:[function(require,module,exports){
'use strict'
module.exports = function (str) {
	var err = new Error(str)
	err.name = 'Warning'
	console.warn(err.stack || (err.name + ': ' + err.message))
}

},{}],11:[function(require,module,exports){
"use strict";

var domain; // The domain module is executed on demand
var hasSetImmediate = typeof setImmediate === "function";

// Use the fastest means possible to execute a task in its own turn, with
// priority over other events including network IO events in Node.js.
//
// An exception thrown by a task will permanently interrupt the processing of
// subsequent tasks. The higher level `asap` function ensures that if an
// exception is thrown by a task, that the task queue will continue flushing as
// soon as possible, but if you use `rawAsap` directly, you are responsible to
// either ensure that no exceptions are thrown from your task, or to manually
// call `rawAsap.requestFlush` if an exception is thrown.
module.exports = rawAsap;
function rawAsap(task) {
    if (!queue.length) {
        requestFlush();
        flushing = true;
    }
    // Avoids a function call
    queue[queue.length] = task;
}

var queue = [];
// Once a flush has been requested, no further calls to `requestFlush` are
// necessary until the next `flush` completes.
var flushing = false;
// The position of the next task to execute in the task queue. This is
// preserved between calls to `flush` so that it can be resumed if
// a task throws an exception.
var index = 0;
// If a task schedules additional tasks recursively, the task queue can grow
// unbounded. To prevent memory excaustion, the task queue will periodically
// truncate already-completed tasks.
var capacity = 1024;

// The flush function processes all tasks that have been scheduled with
// `rawAsap` unless and until one of those tasks throws an exception.
// If a task throws an exception, `flush` ensures that its state will remain
// consistent and will resume where it left off when called again.
// However, `flush` does not make any arrangements to be called again if an
// exception is thrown.
function flush() {
    while (index < queue.length) {
        var currentIndex = index;
        // Advance the index before calling the task. This ensures that we will
        // begin flushing on the next task the task throws an error.
        index = index + 1;
        queue[currentIndex].call();
        // Prevent leaking memory for long chains of recursive calls to `asap`.
        // If we call `asap` within tasks scheduled by `asap`, the queue will
        // grow, but to avoid an O(n) walk for every task we execute, we don't
        // shift tasks off the queue after they have been executed.
        // Instead, we periodically shift 1024 tasks off the queue.
        if (index > capacity) {
            // Manually shift all values starting at the index back to the
            // beginning of the queue.
            for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                queue[scan] = queue[scan + index];
            }
            queue.length -= index;
            index = 0;
        }
    }
    queue.length = 0;
    index = 0;
    flushing = false;
}

rawAsap.requestFlush = requestFlush;
function requestFlush() {
    // Ensure flushing is not bound to any domain.
    // It is not sufficient to exit the domain, because domains exist on a stack.
    // To execute code outside of any domain, the following dance is necessary.
    var parentDomain = process.domain;
    if (parentDomain) {
        if (!domain) {
            // Lazy execute the domain module.
            // Only employed if the user elects to use domains.
            domain = require("domain");
        }
        domain.active = process.domain = null;
    }

    // `setImmediate` is slower that `process.nextTick`, but `process.nextTick`
    // cannot handle recursion.
    // `requestFlush` will only be called recursively from `asap.js`, to resume
    // flushing after an error is thrown into a domain.
    // Conveniently, `setImmediate` was introduced in the same version
    // `process.nextTick` started throwing recursion errors.
    if (flushing && hasSetImmediate) {
        setImmediate(flush);
    } else {
        process.nextTick(flush);
    }

    if (parentDomain) {
        domain.active = process.domain = parentDomain;
    }
}

},{"domain":undefined}]},{},[1]);
