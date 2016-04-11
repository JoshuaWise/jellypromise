'use strict'
var Promise = require('./promise')

Promise.prototype._addStackTrace = function addStackTrace(caller) {
	var temp = {}
	Error.captureStackTrace(temp, caller || addStackTrace)
	this._trace = new _Stack(temp.stack, this._trace)
}
Promise.prototype._parentStackTrace = function (parentPromise) {
	setNonEnumerable(this._trace, 'parent', parentPromise)
}
Promise.prototype._stealStackTrace = function (otherPromise) {
	var end = this._trace
	while (end.parent) {
		end = end.parent
		if (end instanceof Promise) {
			end = end._trace
		}
	}
	setNonEnumerable(end, 'parent', otherPromise._trace)
	otherPromise._trace = this._trace
}

function _Stack(stackPoint, parent) {
	setNonEnumerable(this, 'stackPoint', stackPoint)
	setNonEnumerable(this, 'parent', parent)
}
_Stack.prototype.getTrace = function () {
	var stacks = [formatStackPoint(this.stackPoint, true)]
	var parent = this.parent
	while (parent && stacks.length < 6) {
		if (parent instanceof Promise) {
			parent = parent._trace
		}
		stacks.push(formatStackPoint(parent.stackPoint, false))
		parent = parent.parent
	}
	return stacks
}

function setNonEnumerable(obj, prop, value) {
	Object.defineProperty(obj, prop, {
		value: value,
		enumerable: false,
		configurable: true,
		writable: true
	})
}

function formatStackPoint(stack, first) {
	var lines = stack.split('\n')
	lines[0] = 'From previous event:'
	return lines.map(shrinkPath).slice(first ? 1 : 0, 3).join('\n')
}

function shrinkPath(str) {
	return str.replace(/([A-Z]:\\?)?(([/\\])[^/\\:]+)+/, pathShrinker)
}

function pathShrinker(path, a, b, sep) {
	var parts = path.split(/[/\\]/)
	return '...' + parts.slice(-2).join(sep)
}
