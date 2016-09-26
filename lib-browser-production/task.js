'use strict'
var nextTick = (function () {
	if (typeof Promise === 'function') {
		var nativePromise = Promise.resolve()
		return function (fn) {nativePromise.then(fn)}
	}
	return typeof setImmediate === 'function' ? setImmediate : setTimeout
}())

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
	this.capacity = 16
	this.length = 0
	this.front = 0
}

TaskQueue.prototype.push = function (receiver, arg) {
	var length = this.length + 2
	if (this.capacity < length) {
		this._65(receiver)
		this._65(arg)
	} else {
		// If we don't need to increase the capacity,
		// we can optimize away some things
		var j = this.front + this.length
		var wrapMask = this.capacity - 1
		this[j & wrapMask] = receiver
		this[(j + 1) & wrapMask] = arg
		this.length = length
	}
}

TaskQueue.prototype.shift = function () {
	var front = this.front
	var ret = this[front]
	this[front] = undefined
	this.front = (front + 1) & (this.capacity - 1)
	--this.length
	return ret
}

TaskQueue.prototype._65 = function (value) {
	this._99(this.length + 1)
	this[(this.front + this.length++) & (this.capacity - 1)] = value
}

TaskQueue.prototype._99 = function (newSize) {
	if (this.capacity < newSize) {
		arrayMove(this, this.capacity, (this.front + this.length) & (this.capacity - 1))
		this.capacity <<= 1
	}
}

function arrayMove(array, moveAmount, len) {
	for (var i=0; i<len; ++i) {
		array[i + moveAmount] = array[i]
		array[i] = undefined
	}
}
