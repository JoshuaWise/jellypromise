'use strict'
var Promise = require('./promise.js')

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
		'return function (' + generateArgumentList(maxArgCount).join(', ') + ') {',
			'var self = this',
			'var len = arguments.length',
			'if (len > ' + maxArgCount + ' || len < ' + minArgCount + ') {',
				'var args = new Array(len + 1)',
				'for (var i=0; i<len; i++) {args[i] = arguments[i]}',
			'}',
			'return new Promise(function (res, rej) {',
				'var cb = function (err, val) {err ? rej(err) : res(val)}',
				'switch (len) {',
					argGuesses.map(generateSwitchCase).join('\n'),
					'default:',
						'args[len] = cb',
						'fn.apply(self, args)',
				'}',
			'})',
		'}'
	].join('\n')
	return new Function(['Promise', 'fn'], body)(Promise, fn)
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
			'fn.call(' + ['self'].concat(args).concat('cb').join(', ') + ')',
			'break'
	].join('\n')
}

Promise.nodeify = function (fn) {
	if (typeof fn !== 'function') {
		throw new TypeError('Expected argument to be a function.')
	}
	return function () {
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
