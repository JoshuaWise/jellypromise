'use strict'
var Promise = require('./promise')
var TRACE_SIZE = 7

// Creates a new stack trace that is void.
Promise.prototype._initStackTrace = function () {
	this._trace = new _Stack()
}

// Captures a stack trace and uses it to unvoid the current stack trace.
Promise.prototype._unvoidStackTrace = function _unvoidStackTrace(caller) {
	var temp = {}
	Error.captureStackTrace(temp, caller || _unvoidStackTrace)
	this._trace.stackPoint = temp.stack
	this._trace.void = false
	if (this._trace.parent) {
		cleanStackTrace(this._trace)
	}
}

// Sets the current parent to the given promise.
Promise.prototype._parentStackTrace = function (parentPromise) {
	this._trace.parent = parentPromise
	parentPromise._trace.children++
	if (!this._trace.void) {
		cleanStackTrace(this._trace)
	}
}

// A combination of _unvoidStackTrace() and _parentStackTrace()
Promise.prototype._parent = function _parent(parentPromise) {
	this._unvoidStackTrace(_parent)
	this._parentStackTrace(parentPromise)
	return this
}

// Pushes to the current stack trace, using an exception.
Promise.prototype._addStackTraceFromError = function (err) {
	if (err instanceof Error && err.stack) {
		this._trace = new _Stack(err.stack, this._trace)
		cleanStackTrace(this._trace)
	}
}

// Unshifts the stack trace of another promise into this promise's stack trace,
// and upgrades the other promise's stack trace to this one's.
Promise.prototype._stealStackTrace = function (otherPromise) {
	var end = this._trace
	while (end.parent) {
		end = end.parent
		if (end instanceof Promise) {
			end = end._trace
		}
	}
	end.parent = otherPromise._trace
	otherPromise._trace.children++
	otherPromise._trace = this._trace
	cleanStackTrace(this._trace)
}

// Sets the current stack trace as void, meaning it will be ignored.
Promise.prototype._voidStackTrace = function () {
	this._trace.void = true
}

function _Stack(stackPoint, parent) {
	setNonEnumerable(this, 'stackPoint', stackPoint || '')
	setNonEnumerable(this, 'parent', parent)
	setNonEnumerable(this, 'void', stackPoint ? false : true)
	setNonEnumerable(this, 'children', 0)
}
_Stack.prototype.getTrace = function () {
	var point = this
	var stacks = []
	do {
		if (!point.void) {stacks.push(point.stackPoint)}
		point = point.parent
		if (point instanceof Promise) {
			point = point._trace
		}
	} while (point && stacks.length < TRACE_SIZE)
	return stacks.map(formatStackPoint)
}

function setNonEnumerable(obj, prop, value) {
	Object.defineProperty(obj, prop, {
		value: value,
		enumerable: false,
		configurable: true,
		writable: true
	})
}

function formatStackPoint(stack, i) {
	var lines = stack.split('\n')
	lines[0] = 'From previous event:'
	return lines.map(shrinkPath).slice(i === 0 ? 1 : 0, 3).join('\n')
}

function shrinkPath(str) {
	return str.replace(/([A-Z]:\\?)?(([/\\])[^/\\:]+)+/, pathShrinker)
}

function pathShrinker(path, a, b, sep) {
	var parts = path.split(/[/\\]/)
	return '...' + parts.slice(-2).join(sep)
}

function cleanStackTrace(point) {
	var stacks = 0
	while (point && point.children < 2) {
		if (!point.void) {
			if (++stacks === TRACE_SIZE) {
				point.parent = undefined
				break
			}
		}
		point = point.parent
		if (point instanceof Promise) {
			if (!(point._state & $SUPRESS_UNHANDLED_REJECTIONS)) {
				break
			}
			point = point._trace
		}
	}
}
