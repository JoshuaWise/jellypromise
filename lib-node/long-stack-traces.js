'use strict'
var ErrorStackParser = require('error-stack-parser')
var TRACE_SIZE = 7
var rejectionStack = null
var context = {stack: null, previousStack: null}

exports.init = function () {
	var Promise = require('./promise')
	
	// Captures the current stack info and pushes it onto the stack trace.
	// Optionally trims a certain number of lines from the stack info.
	Promise.prototype._37 = _37
	
	// Pushes an Error's stack info onto the stack trace.
	// This shouldn't be used as a promise's first stack.
	Promise.prototype._48 = _48
}

// Used before an asynchronous callback.
exports.setContext = function (promise, deferred) {
	context.stack = deferred.promise._5
	context.previousStack = promise._5
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
	if (!(stack instanceof _29)) {
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


function _37(trim) {
	var stackPoint = captureStackPoint(_37)
	this._5 = new _29(stackPoint, this._5, trim, null)
	if (context.stack) {
		var end = this._5
		while (end.parent) {end = end.parent}
		end.parent = context.stack
	}
	if (this._5.parent) {
		cleanStackTrace(this._5)
	}
}
function _48(err) {
	if (err instanceof Error
			&& err.stack
			&& typeof err.stack === 'string'
			&& this._5.error !== err) {
		var stackPoint = stackPointFromError(err)
		this._5 = new _29(stackPoint, this._5, 0, err)
		cleanStackTrace(this._5)
	}
}

function _29(stackPoint, parent, trim, err) {
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
_29.prototype.getTrace = function () {
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

var uuidRE = new RegExp('(?:.*(__c9d565ea_0267_11e6_8d22_5e5517507c66).*|.*)(?:\r?\n|$)', 'g')
