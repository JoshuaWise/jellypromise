'use strict'
var Promise = require('./promise')
var FastQueue = require('./fast-queue')
var iterator = require('./util').iterator
var INTERNAL = require('./util').INTERNAL
var NOOP = function () {}

function PromiseStream(source, concurrency) {
	if (concurrency !== undefined && typeof concurrency !== 'number') {
		throw new TypeError('Expected concurrency to be a number, if provided.')
	}
	
	this._state = $STREAM_OPEN
	this._iterator = null // Only used in iterator mode.
	this._queue = new FastQueue // Removed when using iterator mode.
	this._concurrency = Math.max(1, Math.floor(concurrency)) || Infinity
	this._processing = 0
	this._reason = null
	
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
	stream._flushIterator()
	return stream
}
PromiseStream.prototype._write = function (data) {
	if (this._state !== $STREAM_OPEN) {return}
	if (this._processing++ < this._concurrency) {
		/* processData(data) nothrow */
	} else {
		this._queue.push(data)
	}
}
PromiseStream.prototype._end = function () {
	if (this._state !== $STREAM_OPEN) {return}
	if (this._processing === 0) {
		this._state = $STREAM_CLOSED
		this._cleanup()
	} else {
		this._state = $STREAM_CLOSING
		/* ... when processing hits zero, set state to CLOSED and cleanup */
	}
}
PromiseStream.prototype._error = function (reason) {
	if (this._state === $STREAM_CLOSED) {return}
	this._state = $STREAM_CLOSED
	this._reason = reason
	this._processing = 0
	/* cancel processing if possible */
	this._cleanup()
}
PromiseStream.prototype._switchToIteratorMode = function (iterable) {
	if (Array.isArray(iterable)) {
		this._iterator = new ArrayIterator(iterable)
	} else if (iterator && iterable != null && typeof iterable[iterator] === 'function') {
		this._iterator = iterable[iterator]()
	} else {
		throw new TypeError('Expected value to be an iterable object.')
	}
	this._queue = null
}
PromiseStream.prototype._flushIterator = function () {
	if (this._state !== $STREAM_OPEN) {return}
	var concurrency = this._concurrency
	var processing = this._processing
	var iterator = this._iterator
	for (; processing < concurrency; ++processing) {
		var data = getNext(iterator)
		if (next === IS_ERROR) {
			this._error(LAST_ERROR)
			return
		}
		if (LAST_DONE) {
			this._end()
			break
		}
		/* processData(data) nothrow */
	}
	this._processing = processing
}
PromiseStream.prototype._cleanup = function () {
	this._iterator = null
	this._queue = null
	this._removeListeners()
}


var LAST_DONE = false
var LAST_ERROR = null
var IS_ERROR = {}
function getNext(iterator) {
	try {
		var next = iterator.next()
		LAST_DONE = next.done
		return next.value
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
		stream._flushIterator()
	})._then(null, function (reason) {
		stream._error(reason)
	})
	return stream
}

