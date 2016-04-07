'use strict'
function TimeoutError(message) {
	Error.call(this)
	this.message = message
	if (typeof Error.captureStackTrace === 'function') {
		Error.captureStackTrace(this, TimeoutError)
	}
}
TimeoutError.prototype = Object.create(Error.prototype)
TimeoutError.prototype.constructor = TimeoutError
TimeoutError.prototype.name = 'TimeoutError'
module.exports = TimeoutError
