'use strict'
function TimeoutError(message) {
	Error.call(this);
	this.message = message;
	this.name = 'TimeoutError';
	if (typeof Error.captureStackTrace === 'function') {
		Error.captureStackTrace(this, TimeoutError);
	}
}
TimeoutError.prototype = Object.create(Error.prototype);
TimeoutError.prototype.constructor = TimeoutError;
module.exports = TimeoutError
