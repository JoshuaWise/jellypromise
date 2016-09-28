var PromiseDev = require('../../.')
var Promise = require('../../production')
var expect = require('chai').expect
require('chai').use(require('chai-as-promised'))
PromiseDev.suppressWarnings = true

// This function is like the describe() function that mocha provides, but it
// runs all embedded tests twice: once in development mode, once in production
// mode. The callback is passed two arguments:
// (0) Promise - the Promise constructor that the embedded tests should use.
// (1) expect - Chai's expect() function, with the chai-as-promised plugin.
module.exports = function (description, fn) {
	describe(description, function () {
		return fn.call(this, PromiseDev, expect, false)
	})
	describe(description + ' (production)', function () {
		return fn.call(this, Promise, expect, true)
	})
}
