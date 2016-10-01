'use strict'
var Promise = require('./promise')
var FastQueue = require('./fast-queue')
var iterator = require('./util').iterator
var INTERNAL = require('./util').INTERNAL
var NOOP = function () {}

function PromiseStream(source) {
	Promise.call(this, INTERNAL)
	this._addStackTrace(1) // @[/development]
	this._streamState = $STREAM_OPEN
	this._queue = new FastQueue
	this._nextIndex = 0
	this._concurrency = 0
	this._processing = 0
	this._process = null
	this._pipedStream = null // Streams with _pipedStream have _process, but not necessarily the reverse.
	this._flush = _flushQueue
	this._onerror = function (reason) {self._error(reason)}
	
	if (source === INTERNAL) {
		this._removeListeners = NOOP
	} else {
		var self = this, a, b, c
		source.on('data', a = function (data) {self._write(Promise.resolve(data), self._nextIndex++)})
		source.on('end', b = function () {self._end()})
		source.on('error', c = this._onerror)
		this._removeListeners = function () {
			source.removeListener('data', a)
			source.removeListener('end', b)
			source.removeListener('error', c)
			self._removeListeners = NOOP
		}
	}
}
PromiseStream.from = function (iterable) {
	var stream = new PromiseStream(INTERNAL)
	stream._switchToIteratorMode(iterable)
	return stream
}
PromiseStream.prototype.__proto__ = Promise.prototype
PromiseStream.prototype.map = function (concurrency, handler) {
	if (this._streamState === $STREAM_CLOSED) {throw new TypeError('This stream is closed.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	if (arguments.length < 2) {handler = concurrency; concurrency = Infinity}
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	this._concurrency = Math.max(1, Math.floor(concurrency)) || Infinity
	var dest = new PromiseStream(INTERNAL)
	this._state |= $SUPPRESS_UNHANDLED_REJECTIONS
	this._pipedStream = dest
	this._process = MapProcess(this, dest, handler)
	this._flush()
	return dest
}
PromiseStream.prototype.forEach = function (concurrency, handler) {
	if (this._streamState === $STREAM_CLOSED) {throw new TypeError('This stream is closed.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	if (arguments.length < 2) {handler = concurrency; concurrency = Infinity}
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	this._concurrency = Math.max(1, Math.floor(concurrency)) || Infinity
	var dest = new PromiseStream(INTERNAL)
	this._state |= $SUPPRESS_UNHANDLED_REJECTIONS
	this._pipedStream = dest
	this._process = ForEachProcess(this, dest, handler)
	this._flush()
	return dest
}
PromiseStream.prototype.filter = function (concurrency, handler) {
	if (this._streamState === $STREAM_CLOSED) {throw new TypeError('This stream is closed.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	if (arguments.length < 2) {handler = concurrency; concurrency = Infinity}
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	this._concurrency = Math.max(1, Math.floor(concurrency)) || Infinity
	var dest = new PromiseStream(INTERNAL)
	this._state |= $SUPPRESS_UNHANDLED_REJECTIONS
	this._pipedStream = dest
	this._process = FilterProcess(this, dest, handler)
	this._flush()
	return dest
}
PromiseStream.prototype.drain = function (handler) {
	if (this._streamState === $STREAM_CLOSED) {throw new TypeError('This stream is closed.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	this._concurrency = Infinity
	// @[development]
	if (typeof handler !== 'function' && handler != null) {
		warn('The drain handler must be a function (' + typeof handler + 's will be ignored).', this._trace)
	}
	// @[/]
	this._process = DrainProcess(this, typeof handler === 'function' ? handler : NOOP)
	this._flush()
	return this
}
PromiseStream.prototype.merge = function () {
	if (this._streamState === $STREAM_CLOSED) {throw new TypeError('This stream is closed.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	this._concurrency = Infinity
	this._process = MergeProcess(this)
	this._flush()
	return this
}
PromiseStream.prototype.reduce = function (handler, seed) {
	if (this._streamState === $STREAM_CLOSED) {throw new TypeError('This stream is closed.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	this._concurrency = 1
	this._process = ReduceProcess(this, handler, arguments.length > 1, seed)
	this._flush()
	return this
}
Object.defineProperty(PromiseStream.prototype, 'desiredSize', {
	enumerable: true, configurable: true,
	get: function () {
		return this._state & $IS_REJECTED ? null :
		       this._state & $IS_FULFILLED ? 0 :
		       this._concurrency - this._processing - (this._flush === _flushIterator ? 0 : this._queue._length)
	}
})


// ========== Private methods ==========


// Used for pushing data into the stream (not used in iterable mode).
PromiseStream.prototype._write = function (promise, index) {
	if (this._streamState !== $STREAM_OPEN) {return}
	if (this._processing < this._concurrency) {
		this._process(promise, index)
		++this._processing
	} else {
		this._queue.push(promise.catchLater())
		this._queue.push(index)
	}
}


// Used to indicate that there will be no more data added to the stream.
PromiseStream.prototype._end = function () {
	if (this._streamState === $STREAM_CLOSED) {return}
	if (this._process && this._processing === 0) {
		this._pipedStream && this._pipedStream._end()
		this._streamState = $STREAM_CLOSED
		this._resolve(this._value)
		this._cleanup()
	} else {
		this._streamState = $STREAM_CLOSING
	}
}


// Used to indicate that an error has occured, and the stream should immediately close.
PromiseStream.prototype._error = function (reason) {
	if (this._streamState === $STREAM_CLOSED) {return}
	this._pipedStream && this._pipedStream._error(reason)
	this._streamState = $STREAM_CLOSED
	this._reject(reason)
	this._processing = 0
	this._cleanup()
}


// Switches the stream into iterable mode.
// Data will be pulled from an iterable, instead of pushed by an outside source.
PromiseStream.prototype._switchToIteratorMode = function (iterable) {
	if (this._streamState !== $STREAM_OPEN) {return}
	if (Array.isArray(iterable)) {
		this._queue = iterable
		this._flush = _flushArray
	} else {
		var it = getIterator(iterable)
		if (it === IS_ERROR) {
			return this._error(LAST_ERROR)
		}
		this._queue = it
		this._flush = _flushIterator
	}
	this._flush()
}


// Releases internal resources. Should only be used after the stream is CLOSED.
PromiseStream.prototype._cleanup = function () {
	this._queue = null
	this._process = null
	this._pipedStream = null
	this._onerror = null
	this._removeListeners()
}


// Flushes and processes the iterable until the concurrency limit is reached,
// or until the entire iterable has been flushed.
function _flushIterator() {
	if (this._streamState === $STREAM_CLOSED) {return}
	for (; this._processing < this._concurrency; ++this._processing) {
		var data = getNext(this._queue)
		if (data === IS_ERROR) {
			this._error(LAST_ERROR)
			break
		}
		if (data === IS_DONE) {
			this._end()
			break
		}
		this._process(Promise.resolve(data), this._nextIndex++)
	}
}


// Same as _flushIterator, but optimized for arrays.
function _flushArray() {
	if (this._streamState === $STREAM_CLOSED) {return}
	for (; this._processing < this._concurrency; ++this._processing) {
		if (!(this._nextIndex < this._queue.length)) {
			this._nextIndex = NaN
			this._end()
			break
		}
		this._process(Promise.resolve(this._queue[this._nextIndex]), this._nextIndex++)
	}
}


// Flushes and processes the queue until the concurrency limit is reached,
// or until the entire queue has been flushed.
function _flushQueue() {
	if (this._streamState === $STREAM_CLOSED) {return}
	for (; this._queue._length > 0 && this._processing < this._concurrency; ++this._processing) {
		this._process(this._queue.shift(), this._queue.shift())
	}
	if (this._streamState === $STREAM_CLOSING && this._processing === 0) {
		this._end()
	}
}


// ========== Pipe Processes ==========
// It is important that no processes fulfill or reject synchronously


function MapProcess(source, dest, handler) {
	function onFulfilled(value, index) {
		if (source._streamState === $STREAM_CLOSED) {return}
		dest._write(Promise.resolve(value), index)
		--source._processing
		source._flush()
	}
	return function (promise, index) {
		promise._then(handler, undefined, index)._handleNew(onFulfilled, source._onerror, undefined, index)
	}
}
function ForEachProcess(source, dest, handler) {
	function onFulfilled(value, original) {
		if (source._streamState === $STREAM_CLOSED) {return}
		dest._write(original.promise, original.index)
		--source._processing
		source._flush()
	}
	return function (promise, index) {
		promise._then(handler, undefined, index)._handleNew(onFulfilled, source._onerror, undefined, {promise: promise, index: index})
	}
}
function FilterProcess(source, dest, handler) {
	function onFulfilled(value, original) {
		if (source._streamState === $STREAM_CLOSED) {return}
		value && dest._write(original.promise, original.index)
		--source._processing
		source._flush()
	}
	return function (promise, index) {
		promise._then(handler, undefined, index)._handleNew(onFulfilled, source._onerror, undefined, {promise: promise, index: index})
	}
}
function DrainProcess(source, handler) {
	function onFulfilled(value, index) {
		if (source._streamState === $STREAM_CLOSED) {return}
		// With _handleNew, this function is not in a try-catch block.
		// Because of this, normally, it should never be used for external code.
		// However, since .drain() should relinquish control to the user,
		// it turns out to be a convenient way of exiting the safety of
		// our internal promises.
		--source._processing
		source._flush()
		// Also, it's okay to invoke the handler after flushing, because
		// we don't have to worry about the flush causing a piped stream
		// to end. And when it comes to the user knowing about it ending,
		// we're still safe because the stream's promise interface will
		// always notify its handlers asynchronously.
		handler(value, index)
	}
	return function (promise, index) {
		promise._handleNew(onFulfilled, source._onerror, undefined, index)
	}
}
function MergeProcess(source) {
	function onFulfilled(value, index) {
		if (source._streamState === $STREAM_CLOSED) {return}
		array[index] = value
		--source._processing
		source._flush()
	}
	var array = source._value = []
	return function (promise, index) {
		promise._handleNew(onFulfilled, source._onerror, undefined, index)
	}
}
function ReduceProcess(source, handler, hasSeed, accumulator) {
	function onFulfilled(value) {
		if (source._streamState === $STREAM_CLOSED) {return}
		accumulator = source._value = value
		--source._processing
		source._flush()
	}
	function reducer(value, smuggled) {
		if (smuggled === reducer) {
			return value
		}
		return handler.call(controller, smuggled, value)
	}
	var controller = {
		shortcut: function (value) {
			source._value = value
			source._processing = 0
			source._end()
		}
	}
	accumulator = hasSeed ? (source._value = accumulator) : reducer
	return function (promise) {
		promise._then(reducer, undefined, accumulator)._handleNew(onFulfilled, source._onerror)
	}
}


// ========== Extracted try-catch methods ==========
var LAST_ERROR = null
var IS_ERROR = {}
var IS_DONE = {}
function getNext(iterator) {
	try {
		var next = iterator.next()
		return next.done ? IS_DONE : next.value
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
function getIterator(iterable) {
	try {
		if (iterator && iterable != null && typeof iterable[iterator] === 'function') {
			return iterable[iterator]()
		}
		throw new TypeError('Expected value to be an iterable object.')
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}


// ========== Extend Promise API ==========
Promise.Stream = PromiseStream
Promise.prototype.stream = function () {
	var stream = new PromiseStream(INTERNAL)
	this._then(function (iterable) {
		stream._switchToIteratorMode(iterable)
	}, stream._onerror)
	return stream
}

