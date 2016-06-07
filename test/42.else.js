'use strict'
require('../tools/test/describe')('.else', function (Promise, expect) {
	// These tests are not as good as the tests for .catch
	it('should return a new promise', function () {
		var original = Promise.resolve()
		var elsed = original.else()
		expect(elsed).to.be.an.instanceof(Promise)
		expect(original).to.not.equal(elsed)
	})
	it('should provide a default value for rejected promises', function () {
		return expect(Promise.reject(new Error('foo')).else(22)).to.become(22)
	})
	it('should not catch fulfilled promises', function () {
		return expect(Promise.resolve('foo').else(22)).to.become('foo')
	})
	it('should accept class pedicates for conditional catching', function () {
		return expect(
			Promise.reject(new SyntaxError('foo'))
			.else(TypeError, RangeError, 'bar')
			.else(URIError, SyntaxError, 'baz')
		).to.become('baz')
	})
	it('should accept object pedicates for conditional catching', function () {
		var error = new SyntaxError('blah blah')
		error.foo = 9
		return expect(
			Promise.reject(error)
			.else({bar: 9}, {foo: 5}, 5)
			.else({baz: 4}, {foo: 9}, 11)
		).to.become(11)
	})
	it('should accept function pedicates for conditional catching', function () {
		function isBar(err) {return err.message === 'bar'}
		function isBaz(err) {return err.message === 'baz'}
		function is5(err) {return err.message.length === 5}
		function is3(err) {return err.message.length === 3}
		return expect(
			Promise.reject(new Error('foo'))
			.else(isBar, is5, 'wrong')
			.else(isBaz, is3, 'yay')
		).to.become('yay')
	})
	it('should ignore unmatching pedicates', function () {
		function isBar(err) {return err.message === 'bar'}
		return expect(
			Promise.reject(new Error('foo'))
			.else(SyntaxError, 1)
			.else({message: 'bar'}, 1)
			.else(isBar, 1)
			.else(123, 1)
			.else(null, 1)
			.else(undefined, 1)
			.else({}, 1)
			.else(function () {}, 1)
			.else('foo', 1)
		).to.be.rejected
	})
	it('should not ignore good predicates when a bad pedicate exists', function () {
		return expect(
			Promise.reject(new Error('foo'))
			.else(null, 'wrong')
			.else(null, {message: 'foo'}, 'yay')
		).to.become('yay')
	})
	it('should catch instances of class predicates', function () {
		return expect(
			Promise.reject(new SyntaxError('foo'))
			.else(Error, 'yay')
		).to.become('yay')
	})
	it('should treat non-Error classes as function predicates', function () {
		function BlahError() {
			return false
		}
		return expect(
			Promise.reject(Object.create(BlahError.prototype))
			.else(BlahError, 'wrong')
		).to.be.rejectedWith(BlahError)
	})
})
