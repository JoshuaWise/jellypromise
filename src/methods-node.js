'use strict'
var Promise = require('./promise')
var INTERNAL = require('./util').INTERNAL

Promise.promisify = function (fn) {
	if (typeof fn !== 'function') {
		throw new TypeError('Expected argument to be a function.')
	}
	var likelyArgCount = Math.max(0, Math.min(1024, fn.length) - 1) || 0
	var minArgCount = Math.max(0, likelyArgCount - 3)
	var maxArgCount = Math.max(3, likelyArgCount)
	var argGuesses = [likelyArgCount]
	for (var i=likelyArgCount-1; i>=minArgCount; i--) {argGuesses.push(i)}
	for (var i=likelyArgCount+1; i<=maxArgCount; i++) {argGuesses.push(i)}
	var body = [
		'return function promisified(' + generateArgumentList(maxArgCount).join(', ') + ') {',
			'var len = arguments.length',
			'var promise = new Promise(INTERNAL)',
			'var cb = function (err, val) {err == null ? resolve.call(promise, val) : reject.call(promise, err)}',
			'addStackTrace.call(promise, 1)', // @[/development]
			'switch (len) {',
				argGuesses.map(generateSwitchCasePromisify).join('\n'),
				'default:',
					'var args = new Array(len + 1)',
					'for (var i=0; i<len; i++) {args[i] = arguments[i]}',
					'args[len] = cb',
					'tryApply.call(this, fn, args)',
			'}',
			'return promise',
		'}'
	].join('\n')
	return new Function(['Promise', 'fn', 'INTERNAL', 'tryApply', 'tryCatch', 'resolve', 'reject'], body)(Promise, fn, INTERNAL, tryApply, tryCatch, Promise.prototype._resolve, Promise.prototype._reject) // @[/production]
	return new Function(['Promise', 'fn', 'INTERNAL', 'tryApply', 'tryCatch', 'resolve', 'reject', 'addStackTrace'], body)(Promise, fn, INTERNAL, tryApply, tryCatch, Promise.prototype._resolve, Promise.prototype._reject, Promise.prototype._addStackTrace) // @[/development]
}
function generateArgumentList(count) {
	var args = new Array(count)
	for (var i=0; i<count; i++) {
		args[i] = 'a_' + i
	}
	return args
}
function generateSwitchCasePromisify(argLength) {
	var args = generateArgumentList(argLength)
	return [
		'case ' + argLength + ':',
			'tryCatch(fn).call(' + ['this'].concat(args).concat('cb').join(', ') + ')',
			'break'
	].join('\n')
}
function tryApply(fn, args) {
	try {
		return fn.apply(this, args)
	} catch (err) {
		args[args.length - 1](err == null ? new Error(err) : err)
	}
}

var tryCatchFunction = null
function tryCatcher() {
	try {
		var fn = tryCatchFunction
		tryCatchFunction = null
		return fn.apply(this, arguments)
	} catch (err) {
		arguments[arguments.length - 1](err == null ? new Error(err) : err)
	}
}
function tryCatch(fn) {
	tryCatchFunction = fn
	return tryCatcher
}

Promise.nodeify = function (fn) {
	if (typeof fn !== 'function') {
		throw new TypeError('Expected argument to be a function.')
	}
	var likelyArgCount = Math.max(1, Math.min(1024, fn.length + 1)) || 1
	var minArgCount = Math.max(1, likelyArgCount - 3)
	var maxArgCount = Math.max(4, likelyArgCount)
	var argGuesses = [likelyArgCount]
	for (var i=likelyArgCount-1; i>=minArgCount; i--) {argGuesses.push(i)}
	for (var i=likelyArgCount+1; i<=maxArgCount; i++) {argGuesses.push(i)}
	var body = [
		'return function nodeified(' + generateArgumentList(maxArgCount).join(', ') + ') {',
			'var len = arguments.length',
			'var lenM1',
			'if (!len || typeof arguments[lenM1 = len - 1] !== "function") {',
				'fn.apply(this, arguments)',
				'return',
			'}',
			'switch (len) {',
				argGuesses.map(generateSwitchCaseNodeify).join('\n'),
				'default:',
					'var callback = arguments[lenM1]',
					'var args = new Array(lenM1)',
					'for (var i=0; i<lenM1; i++) {args[i] = arguments[i]}',
					'fn.apply(this, args).then(function (value) {',
						'callback(null, value)',
					'}, callback)',
			'}',
		'}'
	].join('\n')
	return new Function('fn', body)(fn)
}

function generateSwitchCaseNodeify(argLength) {
	var args = generateArgumentList(argLength)
	var callback = args.pop()
	return [
		'case ' + argLength + ':',
			'fn.call(' + ['this'].concat(args).join(', ') + ').then(function (value) {',
				callback + '(null, value)',
			'}, ' + callback + ')',
			'break'
	].join('\n')
}
