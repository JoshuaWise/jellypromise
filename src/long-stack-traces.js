'use strict'
var Promise = require('./promise')
var TRACE_SIZE = 7
exports.currentStack = null

// Captures the current stack info and pushes it onto the stack trace.
// Optionally trims a certain number of lines from the stack info.
Promise.prototype._addStackTrace = function _addStackTrace(trim) {
	var temp = {}
	Error.captureStackTrace(temp, _addStackTrace)
	this._trace = new _Stack(temp.stack, this._trace, trim, null)
	if (exports.currentStack && !this._trace.parent) {
		this._trace.parent = exports.currentStack
	}
	if (this._trace.parent) {
		cleanStackTrace(this._trace)
	}
}

// Pushes an Error's stack info onto the stak trace.
Promise.prototype._addStackTraceFromError = function (err) {
	if (err instanceof Error && err.stack && this._trace.error !== err) {
		this._trace = new _Stack(err.stack, this._trace, 0, err)
		cleanStackTrace(this._trace)
	}
}

function _Stack(stackPoint, parent, trim, err) {
	setNonEnumerable(this, 'stackPoint', stackPoint || '')
	setNonEnumerable(this, 'parent', parent)
	setNonEnumerable(this, 'trim', trim >>> 0)
	setNonEnumerable(this, 'error', err)
}
_Stack.prototype.getTrace = function () {
	var point = this
	var stacks = []
	do {
		stacks.push(point)
		point = point.parent
	} while (point && stacks.length < TRACE_SIZE)
	return stacks.map(formatStack)
}

function setNonEnumerable(obj, prop, value) {
	Object.defineProperty(obj, prop, {
		value: value,
		enumerable: false,
		configurable: true,
		writable: true
	})
}

function formatStack(stack, i) {
	var lines = stack.stackPoint.split('\n').slice(1)
	lines = lines.map(shrinkPath).slice(stack.trim, stack.trim + 2)
	if (i > 0) {
		lines.unshift('From previous event:')
	}
	return lines.join('\n')
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
	while (point) {
		if (++stacks === TRACE_SIZE) {
			point.parent = undefined
			break
		}
		point = point.parent
	}
}
