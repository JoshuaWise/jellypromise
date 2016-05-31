'use strict'
require('../tools/describe')('.catch', function (Promise, expect) {
	function shouldNotFulfill() {
		throw new Error('This promise should not have been fulfilled.')
	}
	
	describe('should return a new promise', function () {
		function alwaysTrue() {return true}
		specify('when 0 arguments are supplied', function () {
			var p = Promise.resolve(5)
			return expect(p.catch()).to.be.an.instanceof(Promise).and.not.equal(p)
		})
		specify('when 1 argument is supplied', function () {
			var p = Promise.resolve(5)
			return expect(p.catch(function () {})).to.be.an.instanceof(Promise).and.not.equal(p)
		})
		specify('when 2 arguments are supplied', function () {
			var p = Promise.resolve(5)
			return expect(p.catch(alwaysTrue, function () {})).to.be.an.instanceof(Promise).and.not.equal(p)
		})
		specify('when 3 arguments are supplied', function () {
			var p = Promise.resolve(5)
			return expect(p.catch(Error, alwaysTrue, function () {})).to.be.an.instanceof(Promise).and.not.equal(p)
		})
	})
	describe('should ignore non-function arguments', function () {
		specify('when 1 argument is supplied', function () {
			return Promise.reject(3).catch('foo').then(shouldNotFulfill, function (reason) {
				expect(reason).to.equal(3)
			})
		})
		specify('when 2 arguments are supplied', function () {
			return Promise.reject(3).catch('foo', 10).then(shouldNotFulfill, function (reason) {
				expect(reason).to.equal(3)
			})
		})
		specify('when 3 arguments are supplied', function () {
			return Promise.reject(3).catch('foo', 10, {}).then(shouldNotFulfill, function (reason) {
				expect(reason).to.equal(3)
			})
		})
	})
	describe('should not catch fulfilled promises', function () {
		specify('when 1 argument is supplied', function () {
			var err = new Error('foo')
			return expect(
				Promise.resolve(err).catch(function () {return 'bar'})
			).to.become(err)
		})
		specify('when 2 arguments are supplied', function () {
			var err = new Error('foo')
			return expect(
				Promise.resolve(err).catch(Error, function () {return 'bar'})
			).to.become(err)
		})
		specify('when 3 arguments are supplied', function () {
			function alwaysTrue() {return true}
			var err = new Error('foo')
			return expect(
				Promise.resolve(err).catch(alwaysTrue, {message: 'foo'}, function () {return 'bar'})
			).to.become(err)
		})
	})
	it('should catch rejected promises', function () {
		return expect(
			Promise.reject(44).catch(function (reason) {
				return reason / 2
			})
		).to.become(22)
	})
	it('should accept class pedicates for conditional catching', function () {
		return expect(
			Promise.reject(new SyntaxError('foo'))
				.catch(TypeError, RangeError, function () {})
				.catch(URIError, SyntaxError, function (reason) {
					return reason.message + 'z'
				})
		).to.become('fooz')
	})
	it('should accept object pedicates for conditional catching', function () {
		var err = new SyntaxError()
		err.foo = 9
		return expect(
			Promise.reject(err)
				.catch({bar: 9}, {foo: 5}, function () {})
				.catch({baz: 4}, {foo: 9}, function (reason) {
					return reason.foo + 1
				})
		).to.become(10)
	})
	it('should accept function pedicates for conditional catching', function () {
		function isBar(err) {return err.message === 'bar'}
		function isBaz(err) {return err.message === 'baz'}
		function is5(err) {return err.message.length === 5}
		function is3(err) {return err.message.length === 3}
		return expect(
			Promise.reject(new Error('foo'))
				.catch(isBar, is5, function () {})
				.catch(is3, isBaz, function (reason) {
					return reason.message + 'd'
				})
		).to.become('food')
	})
	it('should ignore non-matching pedicates', function () {
		function isBar(err) {return err.message === 'bar'}
		var err = new Error('foo')
		return Promise.reject(err)
			.catch(SyntaxError, function () {})
			.catch({message: 'bar'}, function () {})
			.catch(isBar, function () {})
			.catch(123, function () {})
			.catch(null, function () {})
			.catch(undefined, function () {})
			.catch({}, function () {})
			.catch(function () {}, function () {})
			.catch('foo', function () {})
			.catch(/foo/, function () {})
			.then(shouldNotFulfill, function (reason) {
				expect(reason).to.equal(err)
			})
	})
	it('should not ignore good predicates when a bad pedicate exists', function () {
		return expect(
			Promise.reject(new Error('foo'))
				.catch(null, function () {})
				.catch(null, {message: 'foo'}, function () {
					return 'bar'
				})
		).to.become('bar')
	})
	it('should catch instances of class predicates', function () {
		return expect(
			Promise.reject(new SyntaxError())
				.catch(Error, function () {
					return 3
				})
		).to.become(3)
	})
	it('should treat non-Error classes as function predicates', function () {
		function BlahError() {
			return false
		}
		var obj = Object.create(BlahError.prototype)
		return Promise.reject(obj)
			.catch(BlahError, function () {
				return 3
			})
			.then(shouldNotFulfill, function (reason) {
				expect(reason).to.equal(obj)
			})
	})
})
