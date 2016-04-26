'use strict'
require('../tools/describe')('.catch', function (Promise, expect) {
	it('should catch exceptions', function () {
		return expect(new Promise(function (res, rej) {
			rej(44)
		}).catch(function (reason) {
			return reason / 2
		})).to.become(22)
	})
	it('should not catch fulfilled promises', function () {
		return expect(new Promise(function (res, rej) {
			res('foo')
		}).catch(function () {
			return 'bar'
		})).to.become('foo')
	})
	it('should accept class pedicates for conditional catching', function () {
		return expect(new Promise(function (res, rej) {
			rej(new SyntaxError('foo'))
		}).catch(TypeError, RangeError, function () {})
		.catch(URIError, SyntaxError, function (reason) {
			return reason.message + 'z'
		})).to.become('fooz')
	})
	it('should accept object pedicates for conditional catching', function () {
		return expect(new Promise(function (res, rej) {
			var err = new SyntaxError('blah blah')
			err.foo = 9
			rej(err)
		}).catch({bar: 9}, {foo: 5}, function () {})
		.catch({baz: 4}, {foo: 9}, function (reason) {
			return reason.foo + 1
		})).to.become(10)
	})
	it('should accept function pedicates for conditional catching', function () {
		function isBar(err) {return err.message === 'bar'}
		function isBaz(err) {return err.message === 'baz'}
		function is5(err) {return err.message.length === 5}
		function is3(err) {return err.message.length === 3}
		return expect(new Promise(function (res, rej) {
			rej(new Error('foo'))
		}).catch(isBar, is5, function () {})
		.catch(isBaz, is3, function (reason) {
			return 'yay'
		})).to.become('yay')
	})
	it('should ignore unatching pedicates', function () {
		function isBar(err) {return err.message === 'bar'}
		return expect(new Promise(function (res, rej) {
			rej(new Error('foo'))
		}).catch(SyntaxError, function () {})
		.catch({message: 'bar'}, function () {})
		.catch(isBar, function () {})
		.catch(123, function () {})
		.catch(null, function () {})
		.catch(undefined, function () {})
		.catch({}, function () {})
		.catch(function () {}, function () {})
		.catch('foo', function () {})).to.be.rejected
	})
	it('should not ignore good predicates when a bad pedicate exists', function () {
		return expect(new Promise(function (res, rej) {
			rej(new Error('foo'))
		}).catch(null, function () {})
		.catch(null, {message: 'foo'}, function () {
			return 'yay'
		})).to.become('yay')
	})
	it('should catch instances of class predicates', function () {
		return expect(new Promise(function (res, rej) {
			rej(new SyntaxError('foo'))
		}).catch(Error, function () {
			return 'yay'
		})).to.become('yay')
	})
	it('should treat non-Error classes as function predicates', function () {
		function BlahError() {
			return false
		}
		return expect(new Promise(function (res, rej) {
			rej(Object.create(BlahError.prototype))
		}).catch(BlahError, function () {
			return 'nah'
		})).to.be.rejectedWith(BlahError)
	})
})
