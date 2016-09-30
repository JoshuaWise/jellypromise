'use strict'
var Promise = require('./promise')
var FastQueue = require('./fast-queue')
var iterator = require('./util').iterator
var INTERNAL = require('./util').INTERNAL
var NOOP = function () {}

function PromiseStream(source) {
	this._state = $STREAM_OPEN
	this._queue = new FastQueue
	this._concurrency = Infinity
	this._processing = 0
	this._reason = null
	this._process = null
	this._flush = _flushQueue
	// Could signal desiredSize as (highWaterMark - processing - queue._length)
	// When cleanly CLOSED, should use ._end() on piped streams
	// Should propagate errors to piped streams
	// If no teeing is implemented, errors should also propagate backwards
	// Should be able to access a closedPromise (that rejects with _reason)
	// Provide reading methods that don't pipe to a new stream; possibilities:
	// - drain() -> emitter
	// - merge() -> promise of array
	// - reduce() -> promise of value
	// - read() -> promise of {value, done}, for single-item pulling
	// Don't forget other piping methods:
	// - filter()
	// - forEach()
	// - sort()
	
	if (source === INTERNAL) {
		this._removeListeners = NOOP
	} else {
		var self = this, a, b, c
		source.on('data', a = function (data) {self._write(data)})
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
PromiseStream.prototype.abort = function (reason) {
	if (reason == null) {
		reason = new TypeError('This stream was aborted.')
	}
	this._error(reason)
	// intentionally returns undefined
}
PromiseStream.prototype.map = function (concurrency, handler) {
	if (this._state === $STREAM_CLOSED) {
		throw TypeError('This stream is closed.')
	}
	if (this._process) {
		throw TypeError('This stream already has a destination.')
	}
	if (typeof concurrency === 'number') {
		this._concurrency = Math.max(1, Math.floor(concurrency)) || Infinity
	} else {
		handler = concurrency
	}
	var self = this
	var stream = new PromiseStream(INTERNAL)
	this._process = MapProcess(this, stream, handler)
	this._flush()
	return stream
}
PromiseStream.prototype._write = function (data) {
	if (this._state !== $STREAM_OPEN) {return}
	if (this._process && this._processing < this._concurrency) {
		this._process(data)
		++this._processing
	} else {
		this._queue.push(data)
	}
}
PromiseStream.prototype._end = function () {
	if (this._state !== $STREAM_OPEN) {return}
	if (this._process && this._processing === 0) {
		this._state = $STREAM_CLOSED
		this._cleanup()
	} else {
		this._state = $STREAM_CLOSING
	}
}
PromiseStream.prototype._error = function (reason) {
	if (this._state === $STREAM_CLOSED) {return}
	this._state = $STREAM_CLOSED
	this._reason = reason
	this._processing = 0
	this._cleanup()
}
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
PromiseStream.prototype._cleanup = function () {
	this._queue = null
	this._process = null
	this._removeListeners()
}
function _flushIterator() {
	if (this._state !== $STREAM_OPEN) {return}
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
		this._process(data)
	}
}
function _flushQueue() {
	if (this._state === $STREAM_CLOSED) {return}
	for (; this._queue._length > 0 && this._processing < this._concurrency; ++this._processing) {
		this._process(this._queue.shift())
	}
}


function MapProcess(source, dest, handler) {
	function onFulfilled(value) {
		if (source._state === $STREAM_CLOSED) {return}
		--source._processing
		source._flush()
		if (source._state === $STREAM_CLOSING && source._processing === 0) {
			source._state = $STREAM_CLOSED
			source._cleanup()
		}
		dest._write(value)
	}
	function onRejected(reason) {
		source._error(reason)
	}
	return function (data) {
		// All processors must NOT decrement source._processing synchronously.
		Promise.resolve(data)._then(handler)._then(onFulfilled, onRejected)
	}
}


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

