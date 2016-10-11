'use strict'
var FastQueue = require('./fast-queue')
// @[browser]
var nextTick = (function () {
	if (typeof Promise === 'function') {
		var nativePromise = Promise.resolve()
		return function (fn) {nativePromise.then(fn)}
	}
	return typeof setImmediate === 'function' ? setImmediate : setTimeout
}())
// @[/]

var pendingFlush = false
var queue = new FastQueue
var lateQueue = new FastQueue
var handler
var lateHandler

module.exports = function (late, receiver, arg) {
	var q = late ? lateQueue : queue
	q.push(receiver)
	q.push(arg)
	if (!pendingFlush) {
		pendingFlush = true
		nextTick(flush) // @[/browser]
		process.nextTick(flush) // @[/node]
	}
}
module.exports.init = function (handlerFunction, lateHandlerFunction) {
	handler = handlerFunction
	lateHandler = lateHandlerFunction
	return this
}

var flush = function () {
	flushQueue(queue, handler)
	flushQueue(lateQueue, lateHandler)
	pendingFlush = false
}

var flushQueue = function (queue, fn) {
	while (queue._length > 0) {
		fn.call(queue.shift(), queue.shift())
	}
}
