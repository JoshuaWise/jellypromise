'use strict'
require('../tools/describe')('.delay', function (Promise, expect) {
	
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
		return delayTest(150, 140, 160)
	})
	it('should treat non-numberic arguments as zero', function () {
		return delayTest({}, 0, 10)
	})
	it('should not delay or catch rejected promises', function () {
		this.timeout(10)
		var err = new Error('foo')
		return expect(Promise.reject(err).delay(150))
			.to.be.rejectedWith(err)
	})
})
