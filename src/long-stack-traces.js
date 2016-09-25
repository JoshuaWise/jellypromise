'use strict'
var ErrorStackParser = require('error-stack-parser')
var TRACE_SIZE = 7
var rejectionStack = null
var context = {stack: null, previousStack: null}
var asapRoot = require('path').dirname(require.resolve('asap'))

exports.init = function () {
	var Promise = require('./promise')
	
	// Captures the current stack info and pushes it onto the stack trace.
	// Optionally trims a certain number of lines from the stack info.
	Promise.prototype._addStackTrace = _addStackTrace
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
// Rejector functions are not allowed to throw, so if something goes wrong, we
// reject the promise with a FatalError.
exports.upgradeRejector = function (rej) {
	return function (err) {
		if (!context.previousStack) {
			err = new SyntaxError('This rejector can only be used within an asynchronous callback.')
			err.name = 'FatalError'
		} else {
			try {
				exports.setRejectionStack(context.previousStack)
			} catch (e) {
				err = e
				err.name = 'FatalError'
			}
		}
		return rej(err)
	}
}

// By setting this, the next promise that is rejected will have this stack.
exports.setRejectionStack = function (stack) {
	if (!(stack instanceof _Stack)) {
		throw new TypeError('Expected argument to be a Stack object.')
	}
	if (rejectionStack) {
		throw new SyntaxError('Invoked .setRejectionStack() twice before a promise was rejected.')
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
	this._trace = new _Stack(stackPoint, this._trace, trim)
	if (context.stack) {
		var end = this._trace
		while (end.parent) {end = end.parent}
		end.parent = context.stack
	}
	if (this._trace.parent) {
		cleanStackTrace(this._trace)
	}
}

function _Stack(stackPoint, parent, trim) {
	setNonEnumerable(this, 'stackPoint', stackPoint)
	setNonEnumerable(this, 'parent', parent)
	setNonEnumerable(this, 'trim', trim >>> 0)
}
_Stack.prototype.getTrace = function () {
	var point = this
	var stacks = []
	do {
		stacks.push(point)
		point = point.parent
	} while (point)
	return stacks.map(formatStack, {count: 0})
		.filter(function (str) {return !!str})
		.join('\nFrom previous event:\n') + '\n'
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
} else {
	var captureStackPoint = function () {
		try {
			throw new Error('YOU SHOULD NEVER SEE THIS')
		} catch (err) {
			if (!err.stack || typeof err.stack !== 'string') {
				throw new Error('Could not generate stack trace.')
			}
			var message = String(err)
			var indexOfMessage = err.stack.indexOf(message)
			if (indexOfMessage === -1) {
				return err.stack
			}
			return err.stack.slice(indexOfMessage + message.length)
				.replace(/^\n*/, '')
				.replace(/^.*\n?.*\n?/, '')
		}
	}
}

function cleanStackTrace(point) {
	var stacks = 0
	var maxPoints = TRACE_SIZE * 2
	while (point) {
		if (++stacks === maxPoints) {
			point.parent = undefined
			break
		}
		point = point.parent
	}
}

function formatStack(stack, index, allStacks) {
	if (!stack.stackPoint || this.count === TRACE_SIZE) {
		return ''
	}
	
	var processed = []
	var parsedLines = ErrorStackParser.parse({stack: stack.stackPoint})
	var lines = stack.stackPoint.split('\n')
	var lineCount = lines.length
	if (lineCount !== parsedLines.length) {
		this.count += 1
		return '    [Failed to parse stack trace]'
	}
	
	for (var i=stack.trim; i<lineCount; ++i) {
		var parsedLine = parsedLines[i]
		var fullPath = parsedLine.fileName || ''
		if (fullPath.indexOf(asapRoot) === 0) {
			break
		}
		if (fullPath.indexOf(__dirname) !== 0) {
			processed.push(shrinkPath(lines[i], fullPath))
		}
	}
	
	if (processed.length) {
		this.count += 1
		return processed.join('\n')
	}
	return ''
}

function shrinkPath(line, fullPath) {
	if (fullPath && line.length > 80) {
		var parts = fullPath.split(/[/\\]/)
		var originalLine = line
		var tries = 0
		do {
			line = originalLine.replace(fullPath, '...' + parts.slice(++tries).join('/'))
		} while (line.length > 80 && parts.length - tries > 2)
	}
	return line
}
