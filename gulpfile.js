'use strict'
var Promise = require('bluebird')
var joinPath = require('path').join
var basename = require('path').basename
var fs = require('fs-extra-promise')
var globPromise = require('glob-promise')
var gulp = require('gulp')
var acorn = require('acorn')
var walk = require('acorn/dist/walk')
var JSRE = /.+\.(js|json)$/i
var directiveRE = /@\[(\/?[\w\s]+|\/)\]/g
var directiveStartRE = /@\[([\w\s]+)\]/
var directiveEndRE = /@\[\/\]/
var directiveSingleRE = /@\[\/([\w\s]+)\]/
var spacesRE = /\s+/g
var glob = function (pattern) {return function () {return globPromise(pattern)}}
var readFile = function (filename) {return fs.readFileAsync(filename).then(String)}
var recognizedDirectives = ['node', 'browser', 'development', 'production']


gulp.task('default', ['node', 'browser', 'node-production', 'browser-production']);
gulp.task('node', function () {
	return process('lib-node', ['node', 'development'])
});
gulp.task('browser', function () {
	return process('lib-browser', ['browser', 'development'])
});
gulp.task('node-production', function () {
	return process('lib-node-production', ['node', 'production'])
});
gulp.task('browser-production', function () {
	return process('lib-browser-production', ['browser', 'production'])
});

gulp.task('clear', function () {
	return Promise.all(
		fs.removeAsync('lib-node'),
		fs.removeAsync('lib-browser'),
		fs.removeAsync('lib-node-production'),
		fs.removeAsync('lib-browser-production')
	)
});


function process(lib, directives) {
	var filenames
	return fs.copyAsync('src', lib, {clobber: true, filter: JSRE})
	.then(glob(lib + '/**/*.js'))
	.then(function (arr) {return filenames = arr})
	.map(readFile)
	.then(obfuscateProperties)
	.map(processDirectives(directives, filenames))
	.map(function (data, i) {return fs.writeFileAsync(filenames[i], data)})
	.then(writeProductionLink(lib, directives))
}

function writeProductionLink(lib, directives) {
	if (directives.indexOf('production') === -1) {
		var productionPath = joinPath('..', lib + '-production')
		return fs.writeFileAsync(joinPath(lib, 'production.js'),
			"'use strict'\nmodule.exports = require('" + productionPath + "')"
		)
	}
}

function obfuscateProperties(sources) {
	var ids = []
	var names = {}
	function getIdFor(name) {
		if (name in names) {return names[name]}
		do {
			var id = '_' + Math.floor(Math.random() * 100)
		} while (ids.indexOf(id) !== -1)
		ids.push(id)
		names[name] = id
		return id
	}
	return sources.map(function (source) {
		var ast = acorn.parse(source)
		source = source.split('')
		walk.simple(ast, {
			MemberExpression: function (node) {
				if (node.computed) return
				if (node.property.type !== 'Identifier') return
				if (node.property.name[0] !== '_') return
				replace(node.property, getIdFor(node.property.name))
			}
		})
		function replace(node, str) {
			for (var i=node.start; i<node.end; i++) {source[i] = ''}
			source[node.start] = str
		}
		return source.join('')
	})
}

function processDirectives(directives, filenames) {
	return function (source, index) {
		var comments = []
		var removeLines = []
		acorn.parse(source, {
			locations: true,
			onComment: comments
		})
		source = source.split('\n')
		parseDirectives(comments.filter(Directive.isDirective), basename(filenames[index]))
			.forEach(function (directive) {
				if (directive.in(directives)) {
					removeLines.push(directive.startLine, directive.endLine)
				} else {
					for (var i=directive.startLine, len=directive.endLine; i<=len; i++) {
						removeLines.push(i)
					}
				}
			})
		return source.filter(
			function (line, n) {return removeLines.indexOf(n) === -1}
		).join('\n')
	}
}

/*==========================*
|       Directive API       |
*===========================*/

function Directive(startComment, endComment) {
	var valueRE = startComment === endComment ? directiveSingleRE : directiveStartRE
	this.startLine = startComment.loc.start.line - 1
	this.endLine = endComment.loc.start.line - 1
	this._directives = startComment.value.match(valueRE)[1].trim().split(spacesRE)
	if (!this.in(recognizedDirectives)) {
		throw new Error('Unrecognized directive in: ' + this)
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
Directive.prototype.toString = function () {
	return JSON.stringify(this._directives, null, 4)
}
Directive.isDirective = function (comment) {
	return comment.type === 'Line' && comment.value.search(directiveRE) !== -1
}

function parseDirectives(comments, filename) {
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
