'use strict'
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
var queue = new TaskQueue
var lateQueue = new TaskQueue
var handler
var lateHandler

module.exports = function (late, receiver, arg) {
	;(late ? lateQueue : queue).push(receiver, arg)
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

function flush() {
	flushQueue(queue, handler)
	flushQueue(lateQueue, lateHandler)
	pendingFlush = false
}

function flushQueue(queue, fn) {
	while (queue.length > 0) {
		fn.call(queue.shift(), queue.shift())
	}
}

function TaskQueue() {
	this.capacity = 16 // Must be a multiple of 2
	this.length = 0
	this.front = 0
}

TaskQueue.prototype.push = function (receiver, arg) {
	if (this.capacity === this.length) {
		arrayMove(this, this.capacity, (this.front + this.length) & (this.capacity - 1))
		this.capacity <<= 1
	}
	var j = this.front + this.length
	var wrapMask = this.capacity - 1
	this[j & wrapMask] = receiver
	this[(j + 1) & wrapMask] = arg
	this.length += 2
}

TaskQueue.prototype.shift = function () {
	var front = this.front
	var ret = this[front]
	this[front] = undefined
	this.front = (front + 1) & (this.capacity - 1)
	--this.length
	return ret
}

function arrayMove(array, moveAmount, len) {
	for (var i=0; i<len; ++i) {
		array[i + moveAmount] = array[i]
		array[i] = undefined
	}
}
