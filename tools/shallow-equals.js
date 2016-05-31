'use strict'
module.exports = function (a) {
	return function (b) {
		if (a === b || !isBaseArray(b) || b.length !== a.length) {
			// Promise.all() never fulfills with the same array as the input.
			// Promise.all() always fulfills with base arrays.
			return false
		}
		for (var i=0, len=a.length; i<len; i++) {
			if (!(i in b)) {
				// Promise.all() fills deleted keys with undefined.
				return false
			}
			if (a[i] !== b[i] && (a[i] === a[i] || b[i] === b[i])) {
				// NaN is considered equal to NaN in this case.
				return false
			}
		}
		return (i in b) === false
	}
}

function isBaseArray(arr) {
	return arr instanceof Array && arr.__proto__ === Array.prototype
}
