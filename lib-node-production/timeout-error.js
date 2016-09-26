'use strict'
function TimeoutError(message) {
	Error.call(this)
	this.message = message
	if (typeof Error.captureStackTrace === 'function') {
		Error.captureStackTrace(this, TimeoutError)
	}
}
TimeoutError.prototype.__proto__ = Error.prototype
TimeoutError.prototype.name = 'TimeoutError'
module.exports = TimeoutError
