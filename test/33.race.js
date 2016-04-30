'use strict'
require('../tools/describe')('Promise.race', function (Promise, expect) {
	it('should be rejected on invalid input', function () {
		return expect(Promise.race(123)).to.be.rejectedWith(TypeError)
	})
	it('should never be resolved when given an empty array', function (done) {
		var called = false
		function doneOnce(err) {
			if (!called) {
				called = true
				done(err)
			}
		}
		Promise.race([]).then(function () {
			doneOnce(new Error('This promise should not have been resolved.'))
		}, doneOnce)
		setTimeout(doneOnce, 200)
	})
	it('from an array of values, should be fulfilled with the first value')
	it('from an array of promises, should be fulfilled from the first promise that fulfills')
	it('from an array of promises, should be rejected from the first promise that rejects')
	it('from an array of values and promises, should be fulfilled with the first value')
	it('from an array of values and rejected promises, should be fulfilled with the first value')
	it('from a sparse array of values and promises, should be fulfilled with the first value')
	it('from a sparse array of rejected promises, should be rejected from the first promise that rejects')
	it('should test being given foreign thenables')
})
