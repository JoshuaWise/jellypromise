'use strict'
var Promise = require('./promise')
var FastQueue = require('./fast-queue')
var iterator = require('./util').iterator
var INTERNAL = require('./util').INTERNAL
var NOOP = function () {}
var isPromise = Promise.isPromise

function PromiseStream(source) {
	Promise.call(this, INTERNAL)
	this._streamState = $STREAM_OPEN
	this._nextIndex = 0
	this._concurrency = 0
	this._processing = 0
	this._isSource = true
	this._queue = new FastQueue
	this._process = null
	this._pipedStream = null // Streams with _pipedStream have _process, but not necessarily the reverse.
	this._flush = flushQueue
	this._onerror = function (reason) {self._error(reason)}
	this._onend = NOOP
	var self = this

	if (source === INTERNAL) {
		this._removeListeners = NOOP
	} else {
		var onError = this._onerror
		var onEnd = function () {self._end()}
		var onData = function (data) {self._write(Promise.resolve(data), self._nextIndex++)}
		this._removeListeners = function () {
			source.removeListener('error', onError)
			source.removeListener('end', onEnd)
			source.removeListener('data', onData)
			self._removeListeners = NOOP
		}
		source.addListener('error', onError)
		this._streamState === $STREAM_CLOSED || source.addListener('end', onEnd)
		this._streamState === $STREAM_CLOSED || source.addListener('data', onData)
	}
}
PromiseStream.from = function (iterable) {
	var stream = new PromiseStream(INTERNAL)
	stream._switchToIterableMode(iterable)
	return stream
}
PromiseStream.prototype.__proto__ = Promise.prototype
PromiseStream.prototype.map = function (concurrency, handler) {
	if (arguments.length < 2) {handler = concurrency; concurrency = Infinity}
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	return this._pipe(MapProcess, Math.max(1, Math.floor(concurrency)) || Infinity, handler)
}
PromiseStream.prototype.forEach = function (concurrency, handler) {
	if (arguments.length < 2) {handler = concurrency; concurrency = Infinity}
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	return this._pipe(ForEachProcess, Math.max(1, Math.floor(concurrency)) || Infinity, handler)
}
PromiseStream.prototype.filter = function (concurrency, handler) {
	if (arguments.length < 2) {handler = concurrency; concurrency = Infinity}
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	return this._pipe(FilterProcess, Math.max(1, Math.floor(concurrency)) || Infinity, handler)
}
PromiseStream.prototype.takeUntil = function (concurrency, promise) {
	if (arguments.length < 2) {promise = concurrency; concurrency = Infinity}
	if (!isPromise(promise)) {throw new TypeError('Expected argument to a promise-like object.')}
	return this._pipe(TakeUntilProcess, Math.max(1, Math.floor(concurrency)) || Infinity, promise)
}
PromiseStream.prototype.reduce = function (handler, seed) {
	if (typeof handler !== 'function') {throw new TypeError('Expected argument to be a function.')}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	if (this._state & $IS_REJECTED) {this._process = NOOP; return this}
	this._concurrency = 1
	this._process = ReduceProcess(this, handler, arguments.length > 1, seed)
	this._flush()
	return this
}
PromiseStream.prototype.merge = function () {
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	if (this._state & $IS_REJECTED) {this._process = NOOP; return this}
	this._concurrency = Infinity
	this._process = MergeProcess(this)
	this._flush()
	return this
}
PromiseStream.prototype.drain = function (concurrency, handler) {
	if (arguments.length < 2) {handler = concurrency; concurrency = Infinity}
	if (typeof handler !== 'function') {
		if (handler == null) {
			handler = NOOP
		} else if (typeof handler.emit === 'function') {
			var emitter = handler
		} else {
			throw new TypeError('Expected argument to be a function or an event emitter.')
		}
	}
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	if (this._state & $IS_REJECTED) {this._process = NOOP; return this}
	if (emitter) {
		handler = function (item) {
			emitter.emit('data', item)
		}
		this._handleNew(
			function () {
				emitter.emit('end')
			},
			function (reason) {
				emitter.emit('error', reason)
			},
			undefined,
			$NO_INTEGER
		)
	}
	this._concurrency = Math.max(1, Math.floor(concurrency)) || Infinity
	this._process = DrainProcess(this, handler)
	this._flush()
	return this
}


// ========== Private methods ==========


// Used for pushing data into the stream (not used in iterable mode).
PromiseStream.prototype._write = function (promise, index) {
	if (this._streamState !== $STREAM_OPEN) {
		promise.catchLater()
		return
	}
	if (this._processing < this._concurrency) {
		++this._processing
		this._process(promise, index)
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
		this._onend()
		this._resolve(this._value)
		this._cleanup()
	} else {
		this._streamState = $STREAM_CLOSING
	}
}


// Used to indicate that an error has occured, and the stream should immediately close.
PromiseStream.prototype._error = function (reason) {
	if (this._streamState === $STREAM_CLOSED) {return}
	// @[development]
	this._pipedStream && this._pipedStream._error(reason, arguments[1])
	this._streamState = $STREAM_CLOSED
	this._passthroughReject(reason, arguments[1] ? arguments[1] : null)
	// @[/]
	// @[production]
	this._pipedStream && this._pipedStream._error(reason)
	this._streamState = $STREAM_CLOSED
	this._reject(reason)
	// @[/]
	this._processing = 0
	this._cleanup()
}


// Switches the stream into iterable mode.
// Data will be pulled from an iterable, instead of pushed by an outside source.
PromiseStream.prototype._switchToIterableMode = function (iterable) {
	if (this._streamState !== $STREAM_OPEN) {return}
	if (Array.isArray(iterable)) {
		this._queue = iterable
		this._flush = flushArray
	} else {
		var it = getIterator(iterable)
		if (it === IS_ERROR) {
			return this._error(LAST_ERROR)
		}
		this._queue = it
		this._flush = flushIterator
	}
	this._flush()
}


// Releases internal resources. Should only be used after the stream is CLOSED.
PromiseStream.prototype._cleanup = function () {
	this._queue = null
	if (this._process) {this._process = NOOP}
	this._pipedStream = null
	this._onerror = NOOP
	this._onend = NOOP
	this._removeListeners()
}


// Pipes to a new stream, and assigns the given process and concurrency.
PromiseStream.prototype._pipe = function (Process, concurrency, arg) {
	if (this._process) {throw new TypeError('This stream already has a destination.')}
	this._concurrency = concurrency
	var dest = new PromiseStream(INTERNAL)
	dest._isSource = false
	this._state |= $SUPPRESS_UNHANDLED_REJECTIONS
	this._pipedStream = dest
	if (this._state & $IS_REJECTED) {
		this._process = NOOP
		dest._error(this._value)
		return dest
	}
	this._process = Process(this, dest, arg)
	this._flush()
	return dest
}


// Flushes and processes the iterable until the concurrency limit is reached,
// or until the entire iterable has been flushed.
var flushIterator = function () {
	// This first line can be omitted because it is coincidentally never true.
	// if (this._streamState === $STREAM_CLOSED) {return}
	while (this._processing < this._concurrency) {
		var data = getNext(this._queue)
		if (data === IS_ERROR) {
			this._error(LAST_ERROR)
			break
		}
		if (data === IS_DONE) {
			this._end()
			break
		}
		++this._processing
		this._process(Promise.resolve(data), this._nextIndex++)
	}
}


// Same as flushIterator, but optimized for arrays.
var flushArray = function () {
	// This first line can be omitted because it is coincidentally never true.
	// if (this._streamState === $STREAM_CLOSED) {return}
	while (this._processing < this._concurrency) {
		if (!(this._nextIndex < this._queue.length)) {
			this._nextIndex = NaN
			this._end()
			break
		}
		++this._processing
		this._process(Promise.resolve(this._queue[this._nextIndex]), this._nextIndex++)
	}
}


// Flushes and processes the queue until the concurrency limit is reached,
// or until the entire queue has been flushed.
var flushQueue = function () {
	// This first line can be omitted because it is coincidentally never true.
	// if (this._streamState === $STREAM_CLOSED) {return}
	while (this._queue._length > 0 && this._processing < this._concurrency) {
		++this._processing
		this._process(this._queue.shift(), this._queue.shift())
	}
	if (this._streamState === $STREAM_CLOSING && this._processing === 0) {
		this._end()
	}
}


// ========== Pipe Processes ==========
// It is important that no processes flush synchronously


var MapProcess = function (source, dest, handler) {
	function onFulfilled(value, index, mappedPromise) {
		if (source._streamState === $STREAM_CLOSED) {return}
		dest._write(mappedPromise, index)
		--source._processing
		source._flush()
	}
	function handle(value, index) {
		if (source._streamState === $STREAM_CLOSED) {return}
		return handler(value, index)
	}
	return function (promise, index) {
		var mappedPromise = promise._then(handle, undefined, index)
		mappedPromise._handleNew(onFulfilled, source._onerror, undefined, index, mappedPromise)
	}
}
var ForEachProcess = function (source, dest, handler) {
	function onFulfilled(value, index, originalPromise) {
		if (source._streamState === $STREAM_CLOSED) {return}
		dest._write(originalPromise, index)
		--source._processing
		source._flush()
	}
	function handle(value, index) {
		if (source._streamState === $STREAM_CLOSED) {return}
		return handler(value, index)
	}
	return function (promise, index) {
		promise._then(handle, undefined, index)._handleNew(onFulfilled, source._onerror, undefined, index, promise)
	}
}
var FilterProcess = function (source, dest, handler) {
	function onFulfilled(value, index, originalPromise) {
		if (source._streamState === $STREAM_CLOSED) {return}
		value && dest._write(originalPromise, index)
		--source._processing
		source._flush()
	}
	function handle(value, index) {
		if (source._streamState === $STREAM_CLOSED) {return}
		return handler(value, index)
	}
	return function (promise, index) {
		promise._then(handle, undefined, index)._handleNew(onFulfilled, source._onerror, undefined, index, promise)
	}
}
var TakeUntilProcess = function (source, dest, donePromise) {
	function onFulfilled(value, index, originalPromise) {
		if (source._streamState === $STREAM_CLOSED) {return}
		dest._write(originalPromise, index)
		--source._processing
		source._flush()
	}
	Promise.resolve(donePromise)._handleNew(function () {
		source._processing = 0
		source._end()
	}, source._onerror, undefined, $NO_INTEGER)
	return source._isSource ? function (promise, index) {
		promise._handleNew(onFulfilled, source._onerror, undefined, index, promise)
	} : function (promise, index) {
		onFulfilled(undefined, index, promise)
	}
}
var ReduceProcess = function (source, handler, hasSeed, accumulator) {
	function onFulfilled(value) {
		if (source._streamState === $STREAM_CLOSED) {return}
		accumulator = value
		--source._processing
		source._flush()
	}
	function handle(value) {
		if (source._streamState === $STREAM_CLOSED) {return}
		return handler(accumulator, value, shortcut)
	}
	function shortcut(value) {
		if (source._streamState === $STREAM_CLOSED) {return}
		accumulator = value
		source._processing = 0
		source._end()
	}
	source._onend = function () {
		source._value = accumulator === handle ? undefined : accumulator
	}
	if (hasSeed) {
		++source._processing
		Promise.resolve(accumulator)._handleNew(onFulfilled, source._onerror, undefined, $NO_INTEGER)
	} else {
		accumulator = handle
	}
	return function (promise) {
		accumulator === handle
			? promise._handleNew(onFulfilled, source._onerror, undefined, $NO_INTEGER)
			: promise._then(handle)._handleNew(onFulfilled, source._onerror, undefined, $NO_INTEGER)
	}
}
var MergeProcess = function (source) {
	function onFulfilled(value, index) {
		if (source._streamState === $STREAM_CLOSED) {return}
		array[index] = value
		--source._processing
		source._flush()
	}
	var array = []
	source._onend = function () {
		source._value = removeHoles(array)
	}
	return source._isSource ? function (promise, index) {
		promise._handleNew(onFulfilled, source._onerror, undefined, index)
	} : function (promise, index) {
		onFulfilled(promise._getFollowee()._value, index)
	}
}
var DrainProcess = function (source, handler) {
	function onFulfilled(value, index) {
		if (source._streamState === $STREAM_CLOSED) {return}
		// With _handleNew, this function is not in a try-catch block,
		// so normally, it should never be used for external code.
		// However, since .drain() should relinquish control to the user,
		// it turns out to be a convenient way of exiting the safety of
		// our internal promises.
		--source._processing
		source._flush()
		// Also, it's okay to invoke the handler after flushing, because
		// we don't have to worry about the flush causing a piped stream
		// to end.
		handler(value, index)
	}
	return source._isSource ? function (promise, index) {
		promise._handleNew(onFulfilled, source._onerror, undefined, index)
	} : function (promise, index) {
		onFulfilled(promise._getFollowee()._value, index)
	}
}

var removeHoles = function (array) {
	for (var i=0, len=array.length; i<len; ++i) {
		if (array.hasOwnProperty(i)) {
			result && result.push(array[i])
		} else if (!result) {
			var result = array.slice(0, i)
		}
	}
	return result || array
}


// ========== Extracted try-catch methods ==========
var LAST_ERROR = null
var IS_ERROR = {}
var IS_DONE = {}
var getNext = function (iterator) {
	try {
		var next = iterator.next()
		return next.done ? IS_DONE : next.value
	} catch (ex) {
		LAST_ERROR = ex
		return IS_ERROR
	}
}
var getIterator = function (iterable) {
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
	var self = this // @[/development]
	var stream = new PromiseStream(INTERNAL)
	this._handleNew(
		function (iterable) {
			stream._switchToIterableMode(iterable)
		},
		// @[development]
		function (reason) {
			stream._error(reason, self._getFollowee()._trace)
		},
		// @[/]
		stream._onerror, // @[/production]
		undefined,
		$NO_INTEGER
	)
	return stream
}

