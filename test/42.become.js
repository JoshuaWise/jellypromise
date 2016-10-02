'use strict'
require('../tools/test/describe')('.become', function (Promise, expect) {
	it('should return a new promise', function () {
		var p = Promise.resolve(5)
		return expect(p.become()).to.be.an.instanceof(Promise).and.not.equal(p)
	})
	it('should not affect rejected promises', function () {
		var err = new Error('foo')
		return expect(
			Promise.reject(err).become()
		).to.be.rejectedWith(err)
	})
	it('should provide a new value for fulfilled promises', function () {
		return expect(
			Promise.resolve(44).become(9)
		).to.become(9)
	})
})
