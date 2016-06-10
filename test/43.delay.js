'use strict'
require('../tools/test/describe')('.delay', function (Promise, expect) {
	function delayTest(ms, minTime, maxTime) {
		var p = Promise.resolve('foo')
		var time = Date.now()
		return p.delay(ms).then(function (value) {
			expect(Date.now() - time).to.be.within(minTime, maxTime)
			expect(value).to.equal('foo')
		})
	}
	
	it('should return a new promise', function () {
		var original = Promise.resolve()
		var delayed = original.delay()
		expect(delayed).to.be.an.instanceof(Promise)
		expect(original).to.not.equal(delayed)
	})
	it('should delay resolved promises, maintaining their fulfillment value', function () {
		return delayTest(100, 90, 110)
	})
	it('should not delay or catch rejected promises', function () {
		this.timeout(20)
		var err = new Error('foo')
		return expect(Promise.reject(err).delay(100))
			.to.be.rejectedWith(err)
	})
	it('should treat numeric strings as valid time values', function () {
		return delayTest('1.0e2', 90, 110)
	})
	it('should treat number objects as valid time values', function () {
		var obj = {valueOf: function () {return '1.0e2'}}
		return delayTest(obj, 90, 110)
	})
	describe('should treat non-numeric or negative arguments as zero', function () {
		specify('null', function () {
			return delayTest(null, 0, 20)
		})
		specify('undefined', function () {
			return delayTest(undefined, 0, 20)
		})
		specify('-100', function () {
			return delayTest(-100, 0, 20)
		})
		specify('NaN', function () {
			return delayTest(NaN, 0, 20)
		})
		specify('Infinity', function () {
			return delayTest(Infinity, 0, 20)
		})
		specify('"foo"', function () {
			return delayTest('foo', 0, 20)
		})
		specify('{}', function () {
			return delayTest({}, 0, 20)
		})
		specify('function () {return 100}', function () {
			return delayTest(function () {return 100}, 0, 20)
		})
	})
})
