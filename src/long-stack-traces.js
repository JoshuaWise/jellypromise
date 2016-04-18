'use strict'
var ErrorStackParser = require('error-stack-parser')
var TRACE_SIZE = 7
var rejectionStack = null
var context = {stack: null, previousStack: null}

exports.init = function () {
	var Promise = require('./promise')
	
	// Captures the current stack info and pushes it onto the stack trace.
	// Optionally trims a certain number of lines from the stack info.
	Promise.prototype._addStackTrace = _addStackTrace
	
	// Pushes an Error's stack info onto the stak trace.
	// This shouldn't be used as a promise's first stack.
	Promise.prototype._addStackTraceFromError = _addStackTraceFromError
	
	// Returns the _Stack object of the promise's final followee.
	Promise.prototype._getStack = _getStack
}

// Used before an asynchronous callback.
exports.setContext = function (promise, deferred) {
	context.stack = deferred.promise._trace
	context.previousStack = promise._trace
}
// Used after an asynchronous callback.
exports.releaseContext = function () {
	context.stack = null
	context.previousStack = null
}

// Upgrades a function returned by Promise#_rejector(), so that the rejected
// promise receives the stack trace of the promise that handled its rejection.
exports.upgradeRejector = function (rej) {
	return function (err) {
		if (!context.previousStack) {
			throw new Error('This function can only be used within an asynchronous callback.')
		}
		exports.setRejectionStack(context.previousStack)
		return rej(err)
	}
}

// By setting this, the next promise that is rejected will have this stack.
exports.setRejectionStack = function (stack) {
	if (!(stack instanceof _Stack)) {
		throw new TypeError('Expected argument to be a Stack object.')
	}
	if (rejectionStack) {
		throw new Error('Invoked .setRejectionStack() twice before a promise was rejected.')
	}
	rejectionStack = stack
}
// Returns whether there is a rejection stack to use.
exports.useRejectionStack = function () {
	var temp = rejectionStack
	rejectionStack = null
	return temp
}


function _addStackTrace(trim) {
	var stackPoint = captureStackPoint(_addStackTrace)
	this._trace = new _Stack(stackPoint, this._trace, trim, null)
	if (context.stack) {
		var end = this._trace
		while (end.parent) {end = end.parent}
		end.parent = context.stack
	}
	if (this._trace.parent) {
		cleanStackTrace(this._trace)
	}
}
function _addStackTraceFromError(err) {
	if (err instanceof Error
			&& err.stack
			&& typeof err.stack === 'string'
			&& this._trace.error !== err) {
		var stackPoint = stackPointFromError(err)
		this._trace = new _Stack(stackPoint, this._trace, 0, err)
		cleanStackTrace(this._trace)
	}
}

function _getStack() {
	var self = this
	while (self._state & $IS_FOLLOWING) {
		self = self._value
	}
	return self._trace
}

function _Stack(stackPoint, parent, trim, err) {
	setNonEnumerable(this, 'stackPoint', stackPoint)
	setNonEnumerable(this, 'parent', parent)
	setNonEnumerable(this, 'trimStart', trim >>> 0)
	setNonEnumerable(this, 'trimEnd', 0)
	setNonEnumerable(this, 'error', err)
	
	var isVoid = !stackPoint
	if (!isVoid) {
		var match
		while ((match = uuidRE.exec(stackPoint)) && match[0]) {
			if (match[1]) {break}
			++this.trimEnd
		}
		isVoid = this.trimEnd <= this.trimStart
		uuidRE.lastIndex = 0
	}
	
	setNonEnumerable(this, 'void', isVoid)
}
_Stack.prototype.getTrace = function () {
	var point = this
	var stacks = []
	do {
		point.void || stacks.push(point)
		point = point.parent
	} while (point && stacks.length < TRACE_SIZE)
	return stacks.map(formatStack).join('\nFrom previous event:\n') + '\n'
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
	var captureStackPoint = function (caller) {
		var temp = {}
		Error.captureStackTrace(temp, caller)
		return temp.stack.replace(/^.*\n?/, '')
	}
	var stackPointFromError = function (err) {
		return err.stack.slice(String(err).length + 1)
	}
} else {
	var captureStackPoint = function () {
		try {
			throw new Error('YOU SHOULD NEVER SEE THIS')
		} catch (err) {
			return stackPointFromError(err).replace(/^.*\n?.*\n?/, '')
		}
	}
	var stackPointFromError = function (err) {
		if (!err.stack || typeof err.stack !== 'string') {
			throw new Error('Could not generate stack trace.')
		}
		var message = String(err)
		var indexOfMessage = err.stack.indexOf(message)
		if (indexOfMessage === -1) {
			return err.stack
		}
		return err.stack.slice(indexOfMessage + message.length).replace(/^\n*/, '')
	}
}

function cleanStackTrace(point) {
	var stacks = 0
	while (point) {
		if (!point.void) {
			if (++stacks === TRACE_SIZE) {
				point.parent = undefined
				break
			}
		}
		point = point.parent
	}
}

function formatStack(stack) {
	var parsedLines = ErrorStackParser.parse({stack: stack.stackPoint})
	var lines = stack.stackPoint.split('\n')
	if (lines.length !== parsedLines.length) {
		throw new Error('Failed to parse stack trace.')
	}
	
	lines = lines.map(shrinkPath, parsedLines)
	lines = lines.slice(stack.trimStart, stack.trimEnd)
	
	return lines.join('\n')
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

var uuidRE = new RegExp('(?:.*($UUID).*|.*)(?:\\r?\\n|$)', 'g')
