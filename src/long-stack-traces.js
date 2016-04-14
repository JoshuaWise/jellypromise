'use strict'
var Promise = require('./promise')
var ErrorStackParser = require('error-stack-parser')
var TRACE_SIZE = 7
exports.currentStack = null

// Captures the current stack info and pushes it onto the stack trace.
// Optionally trims a certain number of lines from the stack info.
Promise.prototype._addStackTrace = function _addStackTrace(trim) {
	var stackPoint = captureStackTrace(_addStackTrace)
	this._trace = new _Stack(stackPoint, this._trace, trim, null)
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

if (typeof Error.captureStackTrace === 'function') {
	var captureStackTrace = function (caller) {
		var temp = {}
		Error.captureStackTrace(temp, caller)
		return temp.stack
	}
} else {
	var captureStackTrace = function () {
		try {
			throw new Error('YOU SHOULD NEVER SEE THIS')
		} catch (err) {
			if (!err.stack || typeof err.stack !== 'string') {
				throw new Error('Could not generate stack trace.')
			}
			var lines = err.stack.split('\n')
			lines.splice(1, 2) // This simulates the "caller" argument of Error.captureStackTrace
			return lines.join('\n')
		}
	}
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

function formatStack(stack, i) {
	var parsedLines = ErrorStackParser.parse({stack: stack.stackPoint})
	var lines = stack.stackPoint.split('\n')
	if (lines.length > parsedLines.length) {
		lines.shift(1)
	}
	if (lines.length !== parsedLines.length) {
		throw new Error('Failed to parse stack trace.')
	}
	
	var indexOfInternal = indexOfFunction(parsedLines, 'tryCallOne_c9d565ea_0267_11e6_8d22_5e5517507c66')
	lines = lines.map(shrinkPath, parsedLines)
	lines = lines.slice(stack.trim, indexOfInternal === -1 ? lines.length : indexOfInternal)
	
	if (i > 0) {
		lines.unshift('From previous event:')
	}
	return lines.join('\n')
}

function indexOfFunction(parsedLines, name) {
	for (var i=0, len=parsedLines.length; i<len; i++) {
		var functionName = parsedLines[i].functionName || ''
		if (functionName.indexOf(name) !== -1) {
			return i
		}
	}
	return -1
}

function shrinkPath(line, i) {
	var fullPath = this[i].fileName || ''
	if (fullPath) {
		var parts = fullPath.split(/[/\\]/)
		if (parts.length > 2) {
			return line.replace(fullPath, '...' + parts.slice(-2).join('/'))
		}
	}
	return line
}
