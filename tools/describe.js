var PromiseDev = require('../.')
var Promise = require('../production')
var expect = require('chai').expect
require('chai').use(require('chai-as-promised'))

module.exports = function (description, fn) {
	describe(description, function () {
		return fn.call(this, PromiseDev, expect)
	})
	describe(description + ' (production)', function () {
		return fn.call(this, Promise, expect)
	})
}
