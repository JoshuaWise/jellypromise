'use strict'

module.exports = function (test) {
	function testInput(value) {
		var hasValue = !!arguments.length
		specify('given: ' + String(hasValue ? value : '[no arguments]'), function () {
			return hasValue ? test(value) : test()
		})
	}
	testInput()
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
}
