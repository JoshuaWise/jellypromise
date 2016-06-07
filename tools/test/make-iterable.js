'use strict'
module.exports = function (arr) {
	if (typeof Symbol === 'function' && Symbol.iterator) {
		var obj = {}
		obj[Symbol.iterator] = function () {
			var i = 0
			return {next: function () {
				return i < arr.length
				 ? {done: false, value: arr[i++]}
				 : {done: true}
			}}
		}
		return obj
	}
	return arr
}
