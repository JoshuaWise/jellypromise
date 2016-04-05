'use strict'
module.exports = function (str) {
	var err = new Error(str)
	err.name = 'Warning'
	console.warn(err.stack)
}
