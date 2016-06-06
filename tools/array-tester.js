'use strict'
var makeIterable = require('./make-iterable')
var memo = {}

function ArrayTester(Promise) {
	this._Promise = Promise
}
ArrayTester.prototype.test = function (source, test) {
	var Promise = this._Promise
	var permutations = memo[source.length]
	
	if (!permutations) {
		memo[source.length] = permutations = permutate(options, source.length)
		for (var i=0; i<options.length; i++) {
			var extraPossibility = new Array(source.length)
			for (var j=0; j<source.length; j++) {
				extraPossibility[j] = options[i]
			}
			permutations.push(extraPossibility)
		}
	}
	
	permutations.forEach(function (options) {
		var sourceLength = source.length
		var description1 = new Array(sourceLength)
		var description2 = new Array(sourceLength)
		var input1 = new Array(sourceLength)
		var input2 = new Array(sourceLength)
		var afters1 = []
		var afters2 = []
		for (var i=0; i<sourceLength; i++) {
			var option = options[i]
			option.call(Promise, description1, source, input1, afters1, i)
			option.call(Promise, description2, source, input2, afters2, i)
		}
		doTest(description1.join(', ') + ' (array)', input1, afters1)
		doTest(description2.join(', ') + ' (iterable)', makeIterable(input2), afters2)
	})
	
	function doTest(description, input, afters) {
		specify(description, function () {
			var ret = test(input, source)
			afters.forEach(call)
			return ret
		})
	}
}
module.exports = ArrayTester

// a = the value itself
// b = an already-fulfilled promise of the value
// c = an immediately-fulfilling promise of the value
// d = an eventually-fulfilling promise of the value
// e = a foreign thenable object that synchronously delivers the value
// f = a foreign thenable object that asynchronously delivers the value
var options = [
	// the value itself
	function (description, source, input, afters, i) {
		if (i in source) {
			input[i] = source[i]
		}
		description[i] = 'a'
	},
	// an already-fulfilled promise of the value
	function (description, source, input, afters, i) {
		var value = getValue(source, i, this)
		input[i] = WAS_REJECTED ? this.reject(value).catchLater() : this.resolve(value)
		description[i] = 'b'
	},
	// an immediately-fulfilling promise of the value
	function immediatePromise(description, source, input, afters, i) {
		var value = getValue(source, i, this)
		var wasRejected = WAS_REJECTED
		input[i] = new this(function (res, rej) {
			afters.push(function () {
				;(wasRejected ? rej : res)(value)
			})
		})
		description[i] = 'c'
	},
	// an eventually-fulfilling promise of the value
	function eventualPromise(description, source, input, afters, i) {
		var value = getValue(source, i, this)
		var wasRejected = WAS_REJECTED
		input[i] = new this(function (res, rej) {
			afters.push(function () {
				setTimeout(function () {
					;(wasRejected ? rej : res)(value)
				}, 1)
			})
		})
		description[i] = 'd'
	},
	// a foreign thenable object that synchronously delivers the value
	function syncThenable(description, source, input, afters, i) {
		var value = getValue(source, i, this)
		if (WAS_REJECTED) {
			var then = function (x, fn) {
				if (typeof fn === 'function') {
					fn(value)
				}
			}
		} else {
			var then = function (fn) {
				if (typeof fn === 'function') {
					fn(value)
				}
			}
		}
		input[i] = {then: then}
		description[i] = 'e'
	},
	// a foreign thenable object that asynchronously delivers the value
	function asyncThenable(description, source, input, afters, i) {
		var value = getValue(source, i, this)
		if (WAS_REJECTED) {
			var then = function (x, fn) {
				if (typeof fn === 'function') {
					setTimeout(function () {
						fn(value)
					}, 1)
				}
			}
		} else {
			var then = function (fn) {
				if (typeof fn === 'function') {
					setTimeout(function () {
						fn(value)
					}, 1)
				}
			}
		}
		input[i] = {then: then}
		description[i] = 'e'
	}
]

function call(fn) {
	fn()
}
function permutate(inputArr, resultLength) {
	var results = []
	
	function permute(arr, memo) {
		var cur, memo = memo || []
		
		for (var i=0; i<arr.length; i++) {
			cur = arr.splice(i, 1)
			if (memo.length === resultLength - 1) {
				results.push(memo.concat(cur))
			}
			permute(arr.slice(), memo.concat(cur))
			arr.splice(i, 0, cur[0])
		}
		
		return results
	}
	
	return permute(inputArr)
}

var WAS_REJECTED = false
function getValue(source, i, Promise) {
	var value = source[i]
	WAS_REJECTED = false
	if (value instanceof Promise) {
		var inspection = value.inspect()
		if ('reason' in inspection) {
			value.catchLater()
			WAS_REJECTED = true
			return inspection.reason
		} else {
			throw new Error('ArrayTester only accepts arrays of values and rejected promises.')
		}
	}
	return value
}
