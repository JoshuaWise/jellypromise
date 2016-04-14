'use strict'
var Promise = require('./promise')
var asArray = require('./util').asArray
var INTERNAL = require('./util').INTERNAL

// In these implementations, all values from the iterable are plucked before a
// single callback is invoked. Modifying the input array after the handler has
// returned will have no effect on the items that are processed, or the result
// array. The result array is always a safe, clean, base array.

// No items are processed synchronously.

// Each item is processed as soon as it becomes available (in order of promise
// resolution). The index passed to the callback functions are the item's
// position in the input array, NOT their index in the order of processing.
// Of course, in reduce and reduceRight, the execution is ordered.

// All indexes are processed, even deleted or non-existent values of an array.

Promise.prototype.filter = function (fn, ctx) {
	return this._then(function (iterable) {
		if (typeof fn !== 'function') {
			throw new TypeError('Expected first argument to be a function.')
		}
		var array = asArrayCopy(iterable)
		return mapArray(array, fn, ctx)._then(function (bools) {
			var result = []
			for (var i=0, len=bools.length; i<len; i++) {
				bools[i] && result.push(array[i])
			}
			return result
		})
	})
}
Promise.prototype.map = function (fn, ctx) {
	return this._then(function (iterable) {
		if (typeof fn !== 'function') {
			throw new TypeError('Expected first argument to be a function.')
		}
		return mapArray(asArray(iterable), fn, ctx)
	})
}
Promise.prototype.forEach = function (fn, ctx) {
	return this._then(function (iterable) {
		if (typeof fn !== 'function') {
			throw new TypeError('Expected first argument to be a function.')
		}
		var array = asArrayCopy(iterable)
		return mapArray(array, fn, ctx)._then(function () {
			return array
		})
	})
}
Promise.prototype.reduce = function (fn, seed) {
	var useSeed = arguments.length > 1
	return this._then(function (iterable) {
		if (typeof fn !== 'function') {
			throw new TypeError('Expected first argument to be a function.')
		}
		var array = asArrayCopy(iterable)
		if (useSeed) {
			array.unshift(seed)
		} else if (array.length === 0) {
			throw new Error('Cannot reduce an empty iterable with no initial value.')
		}
		var result
		var firstItem = true
		var len = array.length
		var i = useSeed ? 0 : 1
		var setResult = function (value) {result = value}
		return Promise.iterate(array, function (item) {
			if (firstItem) {
				firstItem = false
				result = item
				return
			}
			return Promise.resolve(fn(result, item, i++, len))._then(setResult)
		})._then(function () {return result})
	})
}

function mapArray(input, fn, ctx) {
	var promise = new Promise(INTERNAL)
	promise._addStackTrace(2) // @[/development]
	var pendings = input.length
	var result = new Array(pendings)
	if (pendings === 0) {
		return promise._resolve(result)
	}
	
	var rej = promise._rejector()
	var each = function (i) {
		return function (value) {
			return Promise.resolve(fn.call(ctx, value, i, len))._then(function (value) {
				result[i] = value
				if (--pendings === 0) {promise._resolve(result)}
			})
		}
	}
	for (var i=0, len=pendings; i<len; i++) {
		Promise.resolve(input[i])._then(each(i))._then(null, rej)
	}
	
	return promise
}

function asArrayCopy(iterable) {
	var array = asArray(iterable)
	if (array === iterable) {
		var len = array.length
		var result = new Array(len)
		for (var i=0; i<len; i++) {result[i] = array[i]}
		return result
	}
	return array
}
