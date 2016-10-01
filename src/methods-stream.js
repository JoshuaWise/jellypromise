'use strict'
var Promise = require('./promise')
var FastQueue = require('./fast-queue')
var iterator = require('./util').iterator
var INTERNAL = require('./util').INTERNAL
var NOOP = function () {}

function PromiseStream(source) {
	this._state = $STREAM_OPEN
	this._queue = new FastQueue
	this._nextIndex = 0
	this._concurrency = Infinity
	this._processing = 0
	this._closedPromise = new Promise(INTERNAL)
	this._process = null
	this._pipedStream = null // Streams with _pipedStream have _process, but not necessarily the reverse.
	this._flush = _flushQueue
	// Benchmark different sort methods (2 queues, hash map)
	// See if improvements can be made with waiting on promises too late (i.e., it it's says processing but it isn't really; maybe always queue values that are unresolved promises)
	// Could signal desiredSize as (highWaterMark - processing - queue._length)
	// Test drain handler exceptions
	// Flushing the iterable is probably slow
	// ending processes:
	// - merge() -> promise of array
	// - reduce() -> promise of value
	
	if (source === INTERNAL) {
		this._removeListeners = NOOP
	} else {
		var self = this, a, b, c
		source.on('data', a = function (data) {self._write(Promise.resolve(data), self._nextIndex++)})
		source.on('end', b = function () {self._end()})
		source.on('error', c = function (reason) {self._error(reason)})
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
PromiseStream.prototype.map = function (concurrency, handler) {
	if (this._state === $STREAM_CLOSED) {throw new TypeError('This stream is closed.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	if (arguments.length < 2) {handler = concurrency; concurrency = Infinity}
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	this._concurrency = Math.max(1, Math.floor(concurrency)) || Infinity
	var dest = new PromiseStream(INTERNAL)
	this._closedPromise._state |= $SUPPRESS_UNHANDLED_REJECTIONS
	this._pipedStream = dest
	this._process = MapProcess(this, dest, handler)
	this._flush()
	return dest
}
PromiseStream.prototype.forEach = function (concurrency, handler) {
	if (this._state === $STREAM_CLOSED) {throw new TypeError('This stream is closed.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	if (arguments.length < 2) {handler = concurrency; concurrency = Infinity}
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	this._concurrency = Math.max(1, Math.floor(concurrency)) || Infinity
	var dest = new PromiseStream(INTERNAL)
	this._closedPromise._state |= $SUPPRESS_UNHANDLED_REJECTIONS
	this._pipedStream = dest
	this._process = ForEachProcess(this, dest, handler)
	this._flush()
	return dest
}
PromiseStream.prototype.filter = function (concurrency, handler) {
	if (this._state === $STREAM_CLOSED) {throw new TypeError('This stream is closed.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	if (arguments.length < 2) {handler = concurrency; concurrency = Infinity}
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	this._concurrency = Math.max(1, Math.floor(concurrency)) || Infinity
	var dest = new PromiseStream(INTERNAL)
	this._closedPromise._state |= $SUPPRESS_UNHANDLED_REJECTIONS
	this._pipedStream = dest
	this._process = FilterProcess(this, dest, handler)
	this._flush()
	return dest
}
PromiseStream.prototype.sort = function () {
	if (this._state === $STREAM_CLOSED) {throw new TypeError('This stream is closed.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	var dest = new PromiseStream(INTERNAL)
	this._closedPromise._state |= $SUPPRESS_UNHANDLED_REJECTIONS
	this._pipedStream = dest
	this._process = SortProcess(this, dest)
	this._flush()
	return dest
}
PromiseStream.prototype.drain = function (handler) {
	if (this._state === $STREAM_CLOSED) {throw new TypeError('This stream is closed.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	this._process = DrainProcess(this, handler)
	this._flush()
	return this._closedPromise
}
Object.defineProperty(PromiseStream.prototype, 'closed', {
	enumerable: true, configurable: true,
	get: function () {return this._closedPromise}
})


// ========== Private methods ==========


// Used for pushing data into the stream (not used in iterable mode).
PromiseStream.prototype._write = function (promise, index) {
	if (this._state !== $STREAM_OPEN) {return}
	if (this._process && this._processing < this._concurrency) {
		this._process(promise, index)
		++this._processing
	} else {
		this._queue.push(promise.catchLater())
		this._queue.push(index)
	}
}


// Used to indicate that there will be no more data added to the stream.
PromiseStream.prototype._end = function () {
	if (this._state === $STREAM_CLOSED) {return}
	if (this._process && this._processing === 0) {
		this._pipedStream && this._pipedStream._end()
		this._state = $STREAM_CLOSED
		this._closedPromise._resolve()
		this._cleanup()
	} else {
		this._state = $STREAM_CLOSING
	}
}


// Used to indicate that an error has occured, and the stream should immediately close.
PromiseStream.prototype._error = function (reason) {
	if (this._state === $STREAM_CLOSED) {return}
	this._pipedStream && this._pipedStream._error(reason)
	this._state = $STREAM_CLOSED
	this._closedPromise._reject(reason)
	this._processing = 0
	this._cleanup()
}


// Switches the stream into iterable mode.
// Data will be pulled from an iterable, instead of pushed by an outside source.
PromiseStream.prototype._switchToIteratorMode = function (iterable) {
	if (this._state !== $STREAM_OPEN) {return}
	if (Array.isArray(iterable)) {
		this._queue = new ArrayIterator(iterable)
	} else {
		var it = getIterator(iterable)
		if (it === IS_ERROR) {
			return this._error(LAST_ERROR)
		}
		this._queue = it
	}
	this._flush = _flushIterator
	this._process && this._flush()
}


// Releases internal resources. Should only be used after the stream is CLOSED.
PromiseStream.prototype._cleanup = function () {
	this._queue = null
	this._process = null
	this._pipedStream = null
	this._removeListeners()
}


// Flushes and processes the iterable until the concurrency limit is reached,
// or until the entire iterable has been flushed.
function _flushIterator() {
	if (this._state === $STREAM_CLOSED) {return}
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


// Flushes and processes the queue until the concurrency limit is reached,
// or until the entire queue has been flushed.
function _flushQueue() {
	if (this._state === $STREAM_CLOSED) {return}
	for (; this._queue._length > 0 && this._processing < this._concurrency; ++this._processing) {
		this._process(this._queue.shift(), this._queue.shift())
	}
	if (this._state === $STREAM_CLOSING && this._processing === 0) {
		this._end()
	}
}


// ========== Pipe Processes ==========
// It is important that no processes fulfill or reject synchronously


function MapProcess(source, dest, handler) {
	function onFulfilled(value, index) {
		if (source._state === $STREAM_CLOSED) {return}
		dest._write(Promise.resolve(value), index)
		--source._processing
		source._flush()
	}
	function onRejected(reason) {source._error(reason)}
	return function (promise, index) {
		promise._then(handler, undefined, index)._handleNew(onFulfilled, onRejected, undefined, index)
	}
}
function ForEachProcess(source, dest, handler) {
	function onFulfilled(value, original) {
		if (source._state === $STREAM_CLOSED) {return}
		dest._write(original.promise, original.index)
		--source._processing
		source._flush()
	}
	function onRejected(reason) {source._error(reason)}
	return function (promise, index) {
		promise._then(handler, undefined, index)._handleNew(onFulfilled, onRejected, undefined, {promise: promise, index: index})
	}
}
function FilterProcess(source, dest, handler) {
	function onFulfilled(value, original) {
		if (source._state === $STREAM_CLOSED) {return}
		value && dest._write(original.promise, original.index)
		--source._processing
		source._flush()
	}
	function onRejected(reason) {source._error(reason)}
	return function (promise, index) {
		promise._then(handler, undefined, index)._handleNew(onFulfilled, onRejected, undefined, {promise: promise, index: index})
	}
}
function SortProcess(source, dest) {
	function onFulfilled(promise, index) {
		if (source._state === $STREAM_CLOSED) {return}
		dest._write(promise, index)
		--source._processing
		source._flush()
	}
	function onRejected(reason) {source._error(reason)}
	var nextIndex = 0
	var front
	function flush() {
		var previous
		var node = front
		do {
			var index = node.index
			if (index === nextIndex) {
				onFulfilled(node.promise, nextIndex++)
				if (previous) {
					previous.next = node.next
				} else {
					front = node
				}
			}
		} while (index < nextIndex && (previous = node, node = node.next))
	}
	function sort(value, original) {
		var index = original.index
		if (index === nextIndex) {
			onFulfilled(original.promise, nextIndex++)
			front && flush()
		} else if (front) {
			var beforePrevious
			var previous
			var previousDiff = Infinity
			var node = front
			do {
				var diff = Math.abs(node.index - index)
			} while (diff < previousDiff && (previousDiff = diff, beforePrevious = previous, previous = node, node = node.next))
			if (index > previous.index) {
				previous.next = original
				original.next = node
			} else {
				original.next = previous
				if (beforePrevious) {
					beforePrevious.next = original
				} else {
					front = original
				}
			}
		} else {
			front = original
		}
	}
	return function (promise, index) {
		promise._handleNew(sort, onRejected, undefined, {promise: promise, index: index, next: undefined})
	}
}
function DrainProcess(source, handler) {
	function onFulfilled(value) {
		if (source._state === $STREAM_CLOSED) {return}
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
		// we're still safe because _closedPromise will always notify its
		// handlers asynchronously.
		handler(value)
	}
	function onRejected(reason) {source._error(reason)}
	return function (promise) {
		promise._handleNew(onFulfilled, onRejected)
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
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}


// ========== ArrayIterator ==========
function ArrayIterator(array) {
	this._array = array
	this._index = 0
}
ArrayIterator.prototype.next = function () {
	return this._index < this._array.length
		? {value: this._array[this._index++], done: false}
		: (this._index = NaN, {value: undefined, done: true})
}


// ========== Extend Promise API ==========
Promise.Stream = PromiseStream
Promise.prototype.stream = function () {
	var stream = new PromiseStream(INTERNAL)
	this._then(function (iterable) {
		stream._switchToIteratorMode(iterable)
	}, function (reason) {
		stream._error(reason)
	})
	return stream
}

