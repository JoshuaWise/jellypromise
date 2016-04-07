'use strict'
var Promise = require('promise')
var gulp = require('gulp')
var browserify = require('browserify')
var acorn = require('acorn')
var walk = require('acorn/dist/walk')
var writeFile = Promise.denodeify(require('fs').writeFile)
var directiveRE = /@\[([-\w\s]+)\]/g


gulp.task('default', ['browser', 'node']);


gulp.task('browser', function () {
	return bundle('browser.js')
	.then(processDirectives)
	.then(obfuscateProperties)
	.then(out('browser-production.js'))
});


gulp.task('node', function () {
	return bundle('index.js', {
		commondir: false,
		builtins: false,
		browserField: false,
		detectGlobals: false
	})
	.then(processDirectives)
	.then(obfuscateProperties)
	.then(out('production.js'))
});


function processDirectives(source) {
	var comments = []
	acorn.parse(source, {
		locations: true,
		onComment: comments
	})
	source = source.split('\n')
	comments.filter(onlyDirectives).map(Directive)
		.forEach(function (directive) {
			if (directive.has('development')) {
				source[directive.line] = ''
			} else if (directive.count()) {
				throw new Error('Unrecognized directive in: \n' + directive)
			}
		})
	return source.join('\n')
}

function obfuscateProperties(source) {
	var ids = []
	var names = {}
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
	function getIdFor(name) {
		if (name in names) {return names[name]}
		do {
			var id = '_' + Math.floor(Math.random() * 100)
		} while (ids.indexOf(id) !== -1)
		ids.push(id)
		names[name] = id
		return id
	}
	return source.join('')
}

function bundle(filename, options) {
	return new Promise(function (resolve, reject) {
		var data = []
		var b = browserify(filename, options).bundle()
		b.on('data', function (chunk) {data.push(chunk)})
		b.on('end', function () {resolve(Buffer.concat(data).toString())})
		b.on('error', function (err) {reject(err)})
	})
}

function out(filename) {
	return function (data) {
		return writeFile(filename, data)
	}
}

function onlyDirectives(comment) {
	return comment.type === 'Line' && comment.value.search(directiveRE) !== -1
}

function Directive(comment) {
	var ret = Object.create(Directive.prototype)
	ret._directives = comment.value.match(directiveRE).map(trimDirective)
	ret.line = comment.loc.start.line - 1
	return ret
}
Directive.prototype.has = function (directive) {
	return this._directives.indexOf(directive) !== -1
}
Directive.prototype.count = function () {
	return this._directives.length
}
Directive.prototype.toString = function () {
	return JSON.stringify(this._directives, null, 4)
}

function trimDirective(directive) {
	return directive.replace(directiveRE, '$1').trim()
}
