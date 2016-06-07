var recognizedDirectives = ['node', 'browser', 'development', 'production']
var directiveRE = /@\[(\/?[\w\s]+|\/)\]/g
var directiveStartRE = /@\[([\w\s]+)\]/
var directiveEndRE = /@\[\/\]/
var directiveSingleRE = /@\[\/([\w\s]+)\]/
var spacesRE = /\s+/g

function Directive(startComment, endComment) {
	var regex = startComment === endComment ? directiveSingleRE : directiveStartRE
	var match = startComment.value.match(regex)
	this.startLine = startComment.loc.start.line - 1
	this.endLine = endComment.loc.start.line - 1
	this._directives = match[1].trim().split(spacesRE)
	if (!this.in(recognizedDirectives)) {
		throw new Error('Unrecognized directive in "' + match[0] + '"')
	}
}
Directive.prototype.in = function (allowedDirectives) {
	var directives = this._directives
	for (var i=0, len=directives.length; i<len; i++) {
		if (allowedDirectives.indexOf(directives[i]) === -1) {
			return false
		}
	}
	return true
}
Directive.prototype.keepLines = function () {
	return this.startLine === this.endLine ? [] : [this.startLine, this.endLine]
}
Directive.prototype.eraseLines = function () {
	var start = this.startLine
	var len = this.endLine - start + 1
	var ret = new Array(len)
	for (var i=0; i<len; i++) {ret[i] = start + i}
	return ret
}
Directive.isDirective = function (comment) {
	return comment.type === 'Line' && comment.value.search(directiveRE) !== -1
}
Directive.fromComments = function (comments, filename) {
	var directives = []
	var stack = []
	for (var i=0, len=comments.length; i<len; i++) {
		var comment = comments[i]
		
		var matches = comment.value.match(directiveRE)
		if (matches && matches.length > 1) {
			throw new Error('Multiple directives in ' + filename + ', line ' + comment.loc.start.line + '.')
		}
		
		if (directiveSingleRE.test(comment.value)) {
			directives.push(new Directive(comment, comment))
		} else if (directiveStartRE.test(comment.value)) {
			stack.push(comment)
		} else if (directiveEndRE.test(comment.value)) {
			if (!stack.length) {
				throw new Error('Unbalanced directive pair in ' + filename + ', line ' + comment.loc.start.line + '.')
			}
			directives.push(new Directive(stack.pop(), comment))
		}
	}
	if (stack.length) {
		throw new Error('Missing end-directive in ' + filename + ', line ' + stack[stack.length - 1].loc.start.line + '.')
	}
	return directives
}
module.exports = Directive
