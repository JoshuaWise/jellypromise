'use strict'
var ErrorStackParser = require('error-stack-parser')
var TRACE_SIZE = 7
var rejectionStack = null
var context = {stack: null, previousStack: null}
var taskFile = require.resolve('./task')

exports.init = function () {
	var Promise = require('./promise')
	
	// Captures the current stack info and pushes it onto the stack trace.
	// Optionally trims a certain number of lines from the stack info.
	Promise.prototype._addStackTrace = _addStackTrace
	
	// Pushes an Error's stack info onto the stack trace.
	// // This shouldn't be used as a promise's first stack.
	Promise.prototype._addStackTraceFromError = _addStackTraceFromError
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
		this._trace = new _Stack(stackPointFromError(err), this._trace, 0, err)
		cleanStackTrace(this._trace)
	}
}

function _Stack(stackPoint, parent, trim, error) {
	setNonEnumerable(this, 'stackPoint', stackPoint)
	setNonEnumerable(this, 'parent', parent)
	setNonEnumerable(this, 'trim', trim >>> 0)
	setNonEnumerable(this, 'error', error)
}
_Stack.prototype.getTrace = function () {
	var point = this
	var stacks = []
	
	var errorPoint
	if (point.error) {
		errorPoint = point
		point = point.parent
	}
	
	while (point) {
		stacks.push(point)
		point = point.parent
	}
	
	var formatedStacks = stacks.map(formatStack, {count: 0}).filter(function (str) {return !!str})
	if (errorPoint) {
		formatedStacks[0] = combineStackPoints(formatStack.call({count: 0}, errorPoint), formatedStacks[0])
	}
	
	return formatedStacks.join('\nFrom previous event:\n') + '\n'
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
	var maxPoints = TRACE_SIZE * 2
	while (point) {
		if (++stacks === maxPoints) {
			point.parent = undefined
			break
		}
		point = point.parent
	}
}

function formatStack(stack) {
	if (!stack.stackPoint || this.count === TRACE_SIZE) {
		return ''
	}
	
	// @[node]
	var processed = []
	var parsedLines = ErrorStackParser.parse({stack: stack.stackPoint})
	var lines = stack.stackPoint.split('\n')
	var lineCount = lines.length
	if (lineCount !== parsedLines.length) {
		this.count += 1
		return '    [Failed to parse stack trace]'
	}
	
	for (var i=stack.trim; i<lineCount; ++i) {
		var fullPath = parsedLines[i].fileName || ''
		if (fullPath === taskFile) {
			break
		}
		if (fullPath.indexOf(__dirname) !== 0) {
			processed.push(shrinkPath(lines[i], fullPath))
		}
	}
	// @[/]
	// @[browser]
	var processed = stack.stackPoint.split('\n').slice(stack.trim)
	// @[/]
	
	if (processed.length) {
		this.count += 1
		return processed.join('\n')
	}
	return ''
}

// @[node]
function shrinkPath(line, fullPath) {
	var consoleWidth = process.stdout.columns
	if (consoleWidth && fullPath && line.length > consoleWidth) {
		var parts = fullPath.split(/[/\\]/)
		var originalLine = line
		var tries = 0
		do {
			line = originalLine.replace(fullPath, '...' + parts.slice(++tries).join('/'))
		} while (line.length > consoleWidth && parts.length - tries > 2)
	}
	return line
}
// @[/]

function combineStackPoints(stack1, stack2) {
	var uniqueLines = []
	var lines1 = stack1.split('\n')
	var lines2 = stack2.split('\n')
	var parsedLines1 = ErrorStackParser.parse({stack: stack1})
	var parsedLines2 = ErrorStackParser.parse({stack: stack2})
	if (parsedLines1.length !== lines1.length || parsedLines2.length !== lines2.length) {
		return stack1 || stack2
	}
	nextPendingLine:
	for (var i=0, len2=lines2.length; i<len2; ++i) {
		var pendingLine = parsedLines2[i]
		for (var j=0, len1=lines1.length; j<len1; ++j) {
			var comparedLine = parsedLines1[j]
			if (comparedLine.fileName === pendingLine.fileName
					&& comparedLine.functionName === pendingLine.functionName
					&& comparedLine.lineNumber === pendingLine.lineNumber) {
				continue nextPendingLine
			}
		}
		uniqueLines.push(lines2[i])
	}
	if (uniqueLines.length) {
		return lines1.concat('Used to reject promise:', uniqueLines).join('\n')
	}
	return stack1
}

