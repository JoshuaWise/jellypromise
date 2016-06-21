'use strict'

// This function runs the given test several times, once for each possible
// non-iterable value. Each non-iterable value is passed as the first argument
// to the given test function.
module.exports = function (test) {
	function testInput(value) {
		specify('given: ' + toString(value), function () {
			return test(value)
		})
	}
	testInput(undefined)
	testInput(null)
	testInput(0)
	testInput(123)
	testInput(NaN)
	testInput(Infinity)
	testInput(true)
	testInput(false)
	testInput({})
	testInput(function () {})
	if (typeof Symbol === 'function') {
		testInput(Symbol())
	}
	if (typeof Symbol !== 'function' || !Symbol.iterator) {
		testInput('foo')
	}
}

function toString(value) {
	if (value instanceof Array) {
		return '[' + String(value) + ']'
	}
	if (typeof value === 'string') {
		return '"' + value + '"'
	}
	return String(value)
}
