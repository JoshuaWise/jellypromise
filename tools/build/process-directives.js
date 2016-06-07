var acorn = require('acorn')
var basename = require('path').basename
var Directive = require('./directive')

module.exports = function (directives, filenames) {
	return function (source, index) {
		var comments = []
		var removeLines = []
		acorn.parse(source, {
			locations: true,
			onComment: comments
		})
		source = source.split('\n')
		Directive.fromComments(comments.filter(Directive.isDirective), basename(filenames[index]))
			.forEach(function (directive) {
				var lineRange = directive.in(directives) ? directive.keepLines() : directive.eraseLines()
				removeLines = removeLines.concat(lineRange)
			})
		return source.filter(
			function (line, n) {return removeLines.indexOf(n) === -1}
		).join('\n')
	}
}
