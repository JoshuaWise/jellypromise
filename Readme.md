<a href="https://promisesaplus.com/"><img src="https://promisesaplus.com/assets/logo-small.png" align="right" /></a>
# jellypromise

This is a small implementation of Promises that achieves the following design goals:
- Tiny size (for browser-friendliness)
- Fast performance
- A superset of the [ES6 Promise](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-objects)
- Has a small, carefully-selected set of utilities
- Throws unhandled errors by default (the opposite of what [then/promise](https://github.com/then/promise) does), and provides utilities for useful error handling patterns

[![Build Status](https://img.shields.io/travis/JoshuaWise/jellypromise.svg)](https://travis-ci.org/JoshuaWise/jellypromise)

## Installation

```bash
npm install --save jellypromise
```

## Usage

```js
var Promise = require('jellypromise');

var promise = new Promise(function (resolve, reject) {
  get('http://www.google.com', function (err, res) {
    if (err) reject(err);
    else resolve(res);
  });
});
```

## Unhandled Rejections

When a promise is rejected but has no rejection handlers, the rejection reason will be thrown unless a rejection handler is added before the next event loop tick. This helps the programmer quickly identify and fix errors.

However, in some situations, you may wish to refrain from adding a rejection handler until a later time. In these cases, you can use the `.catchLater()` utility method to supress this behavior.

By default, long stack traces are turned on, for superior debugging capabilities. However, if `process.env.NODE_ENV === 'production'`, they will be turned off for performance reasons.

You can also exclude long stack traces by using:

```js
// This alternative has the advantage of excluding the relevant code from being loaded, resulting in a smaller file size for browser builds using browserify
var Promise = require('jellypromise/production');
```

# API

### new Promise(function *handler*)

This creates and returns a new promise. The `handler` must be a function with the following signature: `function handler(function *resolve*, function *reject*)`

 1. `resolve` should be called with a single argument. If it is called with a non-promise value then the promise is fulfilled with that value. If it is called with a promise, then the constructed promise takes on the state of that promise.
 2. `reject` should be called with a single argument. The returned promise will be rejected with that argument.

#### *static* Promise.resolve(any *value*)

Converts values and foreign promises into `jellypromise` promises. If you pass it a value then it returns a Promise for that value. If you pass it something that is close to a promise (such as a jQuery attempt at a promise) it returns a Promise that takes on the state of `value` (rejected or fulfilled).

#### *static* Promise.reject(any *value*)

Returns a rejected promise with the given value.

#### *static* Promise.all(Array *array*)

Returns a promise for an array of promises (thenables). The returned promise is rejected if any of promises in the array are rejected. Otherwise, it is resolved with an array of each resolved value. Any non-promise values in the array are simply passed to the resolution array in the same position.

```js
Promise.all([Promise.resolve('a'), 'b', Promise.resolve('c')])
  .then(function (res) {
    assert(res[0] === 'a')
    assert(res[1] === 'b')
    assert(res[2] === 'c')
  })
```

#### *static* Promise.promisify(function *fn*)

Takes a function which accepts a node style callback and returns a new function that returns a promise instead.

```js
var fs = require('fs')

var read = Promise.promisify(fs.readFile)
var write = Promise.promisify(fs.writeFile)

var p = read('foo.json', 'utf8')
  .then(function (str) {
    return write('foo.json', JSON.stringify(JSON.parse(str), null, '  '), 'utf8')
  })
```

#### *static* Promise.nodeify(function *fn*)

The twin to `promisify` is useful when you want to export an API that can be used by people who haven't learnt about the brilliance of promises yet.

```js
module.exports = Promise.nodeify(awesomeAPI)
function awesomeAPI(a, b) {
  return download(a, b)
}
```

If the last argument passed to `module.exports` is a function, then it will be treated like a node.js callback and not passed on to the child function. Otherwise, the API will just return a promise.

#### .then(function *onFulfilled*, function *onRejected*)

This method follows the [Promises/A+ spec](http://promises-aplus.github.io/promises-spec/).

Either `onFulfilled` or `onRejected` will be called and they will not be called more than once. They will be passed a single argument and will always be called asynchronously (in the next turn of the event loop).

If the promise is fulfilled then `onFulfilled` is called. If the promise is rejected then `onRejected` is called.

The call to `.then` also returns a promise. If the handler that is called returns a promise, the promise returned by `.then` takes on the state of that returned promise. If the handler that is called returns a value that is not a promise, the promise returned by `.then` will be fulfilled with that value. If the handler that is called throws an exception then the promise returned by `.then` is rejected with that exception.

#### .catch(function *onRejected*)

Sugar for `.then(null, onRejected)`, to mirror `catch` in synchronous code.

#### .catchLater()

Prevents an error from being thrown if the promise is rejected but does not yet have a rejection handler (see [Unhandled Rejections](#unhandled-rejections)).

#### .nodeify(function *callback*)

If `callback` is `null` or `undefined` it just returns `this`. If `callback` is a function it is called with rejection reason as the first argument and result as the second argument (as per the node.js convention).

This lets you write API functions that look like:

```js
function awesomeAPI(foo, bar, callback) {
  return internalAPI(foo, bar)
    .then(parseResult)
    .then(null, retryErrors)
    .nodeify(callback)
}
```

People who use typical node.js style callbacks will be able to just pass a callback and get the expected behavior. The enlightened people can not pass a callback and will get awesome promises.

## License

[MIT](https://github.com/JoshuaWise/jellypromise/blob/master/LICENSE)
