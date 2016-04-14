'use strict'
var Promise = require('./promise')
var TRACE_SIZE = 6

Promise.prototype._newStackTrace = function _newStackTrace(caller) {
	var temp = {}
	Error.captureStackTrace(temp, caller || _newStackTrace)
	this._trace = new _Stack(temp.stack, undefined)
}
Promise.prototype._addStackTraceFromError = function (err) {
	if (err instanceof Error && err.stack) {
		this._trace = new _Stack(err.stack, this._trace)
		cleanStackTrace(this._trace)
	}
}
Promise.prototype._parentStackTrace = function (parentPromise) {
	var previousParent = this._trace.parent
	if (previousParent !== parentPromise) {
		this._trace.parent = parentPromise
		parentPromise._trace.children++
		if (previousParent instanceof Promise) {
			previousParent._trace.children--
		}
		cleanStackTrace(this._trace)
	}
}
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
Promise.prototype._copyStackTrace = function (otherPromise) {
	this._trace = otherPromise._trace
}
Promise.prototype._voidStackTrace = function () {
	this._trace.void = true
}

function _Stack(stackPoint, parent) {
	setNonEnumerable(this, 'stackPoint', stackPoint)
	setNonEnumerable(this, 'parent', parent)
	setNonEnumerable(this, 'void', false)
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
