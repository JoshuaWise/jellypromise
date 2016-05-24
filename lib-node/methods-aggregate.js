'use strict'
var Promise = require('./promise')
var asArray = require('./util').asArray
var INTERNAL = require('./util').INTERNAL
var LST = require('./long-stack-traces') // @[/development]

// In these implementations, all values from the iterable are plucked before a
// single callback is invoked. Modifying the input array after the handler has
// returned will have no effect on the items that are processed, or the result
// array. The result array is always a safe, clean, base array.

// No callback functions are invoked synchronously.
// This is important for predictability, but also to prevent modifying the input
// array in a callback function, before all input values have been plucked.

// Each item is processed as soon as it becomes available (in order of promise
// resolution). The index passed to the callback functions are the item's
// position in the input array, NOT their index in the order of processing.
// Of course, in .reduce(), the execution is ordered.

// All indexes are processed, even deleted or non-existent values of an array.

Promise.prototype.filter = function (fn, ctx) {
	return this._47(function __c9d565ea_0267_11e6_8d22_5e5517507c66(iterable) {
		if (typeof fn !== 'function') {
			throw new TypeError('Expected first argument to be a function.')
		}
		var array = asArrayCopy__c9d565ea_0267_11e6_8d22_5e5517507c66(iterable)
		return mapArray(array, fn, ctx)._47(function (bools) {
			var result = []
			for (var i=0, len=bools.length; i<len; i++) {
				bools[i] && result.push(array[i])
			}
			return result
		})
	})
}
Promise.prototype.map = function (fn, ctx) {
	return this._47(function __c9d565ea_0267_11e6_8d22_5e5517507c66(iterable) {
		if (typeof fn !== 'function') {
			throw new TypeError('Expected first argument to be a function.')
		}
		return mapArray(asArray(iterable), fn, ctx)
	})
}
Promise.prototype.forEach = function (fn, ctx) {
	return this._47(function __c9d565ea_0267_11e6_8d22_5e5517507c66(iterable) {
		if (typeof fn !== 'function') {
			throw new TypeError('Expected first argument to be a function.')
		}
		var array = asArrayCopy__c9d565ea_0267_11e6_8d22_5e5517507c66(iterable)
		return mapArray(array, fn, ctx)._47(function () {
			return array
		})
	})
}
Promise.prototype.reduce = function (fn, seed) {
	var useSeed = arguments.length > 1
	return this._47(function __c9d565ea_0267_11e6_8d22_5e5517507c66(iterable) {
		if (typeof fn !== 'function') {
			throw new TypeError('Expected first argument to be a function.')
		}
		var arr = asArrayCopy__c9d565ea_0267_11e6_8d22_5e5517507c66(iterable)
		if (useSeed) {
			arr.unshift(seed)
		} else if (arr.length === 0) {
			throw new TypeError('Cannot reduce an empty iterable with no initial value.')
		}
		return new Promise(INTERNAL)._80(function (res, rej) {
			var result
			var array = arr
			var firstItem = true
			var len = array.length
			var i = useSeed ? 0 : 1
			
			for (var j=0; j<len; j++) {
				var item = array[j]
				if (item instanceof Promise) {
					item.catchLater()
				}
			}
			
			rej = LST.upgradeRejector(rej) // @[/development]
			var setResult = function (value) {
				result = value
				next()
			}
			var handler = function __c9d565ea_0267_11e6_8d22_5e5517507c66(item) {
				if (firstItem) {
					firstItem = false
					i++
					return setResult(item)
				}
				
				return Promise.resolve(fn(result, item, i++, len))._47(setResult)
			}
			var next = function __c9d565ea_0267_11e6_8d22_5e5517507c66() {
				i === len
					? res(result)
					: Promise.resolve(array[i])._47(handler)._47(null, rej)
			}
			next()
		})
	})
}

function mapArray(input, fn, ctx) {
	return new Promise(INTERNAL)._80(function __c9d565ea_0267_11e6_8d22_5e5517507c66(res, rej) {
		var pendings = input.length
		var result = new Array(pendings)
		if (pendings === 0) {
			return res(result)
		}
		rej = LST.upgradeRejector(rej) // @[/development]
		var each = function (i) {
			return function __c9d565ea_0267_11e6_8d22_5e5517507c66(value) {
				return Promise.resolve(fn.call(ctx, value, i, len))._47(function (value) {
					result[i] = value
					if (--pendings === 0) {res(result)}
				})
			}
		}
		for (var i=0, len=pendings; i<len; i++) {
			Promise.resolve(input[i])._47(each(i))._47(null, rej)
		}
	})
}

function asArrayCopy__c9d565ea_0267_11e6_8d22_5e5517507c66(iterable) {
	var array = asArray(iterable)
	if (array === iterable) {
		var len = array.length
		var result = new Array(len)
		for (var i=0; i<len; i++) {result[i] = array[i]}
		return result
	}
	return array
}
