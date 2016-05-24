'use strict'
var Promise = require('./promise.js')
var INTERNAL = require('./util.js').INTERNAL

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
			'var self = this',
			'var len = arguments.length',
			'if (len > ' + maxArgCount + ' || len < ' + minArgCount + ') {',
				'var args = new Array(len + 1)',
				'for (var i=0; i<len; i++) {args[i] = arguments[i]}',
			'}',
			'var promise = new Promise(INTERNAL)',
			'var cb = function (err, val) {err == null ? promise._resolve(val) : promise._reject(err)}',
			'switch (len) {',
				argGuesses.map(generateSwitchCase).join('\n'),
				'default:',
					'args[len] = cb',
					'tryApply.call(self, fn, args)',
			'}',
			'return promise',
		'}'
	].join('\n')
	return new Function(['Promise', 'fn', 'INTERNAL', 'tryApply', 'tryCatch'], body)(Promise, fn, INTERNAL, tryApply, tryCatch)
}
function generateArgumentList(count) {
	var args = new Array(count)
	for (var i=0; i<count; i++) {
		args[i] = 'a_' + i
	}
	return args
}
function generateSwitchCase(argLength) {
	var args = generateArgumentList(argLength)
	return [
		'case ' + argLength + ':',
			'tryCatch(fn).call(' + ['self'].concat(args).concat('cb').join(', ') + ')',
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
	return function nodeified() {
		var len = arguments.length
		if (typeof arguments[len - 1] === 'function') {
			var callback = args[--len]
			var args = new Array(len)
			for (var i=0; i<len; i++) {
				args[i] = arguments[i]
			}
			fn.apply(this, args).then(function (value) {
				callback(null, value)
			}, callback)
		} else {
			fn.apply(this, arguments)
		}
	}
}
