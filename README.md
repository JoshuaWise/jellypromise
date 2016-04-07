<a href="https://promisesaplus.com/"><img src="https://promisesaplus.com/assets/logo-small.png" align="right" /></a>
# jellypromise

This is a small implementation of Promises that achieves the following design goals:
- Tiny size (for browser-friendliness)
- Fast performance
- A superset of the [ES6 Promise](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-objects)
- Has a small, carefully-selected set of utilities
- Logs unhandled errors by default (the opposite of what [then/promise](https://github.com/then/promise) does), and provides utilities for useful error handling patterns

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

When a promise is rejected but has no rejection handlers, the rejection will be logged to the console unless a rejection handler is added before the next event loop cycle. This helps the programmer quickly identify and fix errors.

However, in some situations, you may wish to refrain from adding a rejection handler until a later time. In these cases, you can use the `.catchLater()` utility method to supress this behavior.

## Production Mode

By default, long stack traces and warnings are turned on, for superior debugging capabilities. However, if `process.env.NODE_ENV === 'production'`, they will be turned off for performance reasons.

You can also exclude these debugging features by using:

```js
// This alternative has the advantage of excluding the relevant code from being loaded, resulting in a smaller file size for browser builds using browserify
var Promise = require('jellypromise/production');
```

Setting `process.env.NODE_ENV` only works in Nodejs. Even if you are using [browserify](https://github.com/substack/node-browserify), to use production mode in the browser, you must require `jellypromise/production`, as shown above.


# API

### new Promise(*handler*)

This creates and returns a new promise. The `handler` must be a function with the following signature: `function handler(function *resolve*, function *reject*)`

 1. `resolve` should be called with a single argument. If it is called with a non-promise value then the promise is fulfilled with that value. If it is called with a promise, then the constructed promise takes on the state of that promise.
 2. `reject` should be called with a single argument. The returned promise will be rejected with that argument.

#### *static* Promise.resolve(*value*)

Converts values and foreign promises into `jellypromise` promises. If you pass it a value then it returns a Promise for that value. If you pass it something that is close to a promise (such as a jQuery attempt at a promise) it returns a Promise that takes on the state of `value` (rejected or fulfilled).

#### *static* Promise.reject(*value*)

Returns a rejected promise with the given value.

#### *static* Promise.all(*iterable*)

Returns a promise for an array (or iterable) of promises. The returned promise is rejected if any of promises in the array are rejected. Otherwise, it is resolved with an array of each resolved value. Any non-promise values in the array are simply passed to the resolution array in the same position.

```js
Promise.all([Promise.resolve('a'), 'b', Promise.resolve('c')])
  .then(function (results) {
    assert(results[0] === 'a')
    assert(results[1] === 'b')
    assert(results[2] === 'c')
  })
```

#### *static* Promise.race(*iterable*)

Returns a promise that resolves or rejects with the same value/reason as the first resolved/rejected promise in the array/iterable argument. Non-promise values in the array are converted to promises with `Promise.resolve()`.

```js
Promise.race([promiseA, promiseB, promiseC])
  .then(function (result) {
    // "result" is either the value of promiseA, promiseB, or promiseC
  })
```

#### *static* Promise.promisify(*func*)

Takes a function which accepts a node style callback and returns a new function that returns a promise instead.

```js
var fs = require('fs')

var read = Promise.promisify(fs.readFile)
var write = Promise.promisify(fs.writeFile)

var promise = read('foo.json', 'utf8')
  .then(function (str) {
    var json = JSON.parse(str)
    json.foo = 'bar'
    return write('foo.json', JSON.stringify(json), 'utf8')
  })
```

**WARNING:** This function is not available in the browser.

#### *static* Promise.nodeify(*func*)

Converts a promise-returning function to a function that instead accepts a node style callback as its last argument. The newly created function will always return undefined.

```js
var callbackAPI = Promise.nodeify(promiseAPI)

callbackAPI('foo', 'bar', function (err, result) {
  // handle error or result here
})
```

**WARNING:** This function is not available in the browser.

#### .then(function *onFulfilled*, function *onRejected*)

This method follows the [Promises/A+ spec](http://promises-aplus.github.io/promises-spec/).

Either `onFulfilled` or `onRejected` will be called and they will not be called more than once. They will be passed a single argument and will always be called asynchronously (in the next turn of the event loop).

If the promise is fulfilled then `onFulfilled` is called. If the promise is rejected then `onRejected` is called.

The call to `.then` also returns a promise. If the handler that is called returns a promise, the promise returned by `.then` takes on the state of that returned promise. If the handler that is called returns a value that is not a promise, the promise returned by `.then` will be fulfilled with that value. If the handler that is called throws an exception then the promise returned by `.then` is rejected with that exception.

#### .catch([...predicates], function *onRejected*)

Sugar for `.then(null, onRejected)`, to mirror `catch` in synchronous code.

If any `predicates` are specified, the `onRejected` handler only catches exceptions that match one of the `predicates`.

A `predicate` can be:
- an `Error` class (`.catch(TypeError, SyntaxError, func)`)
- an object defining required property values (`.catch({code: 'ENOENT'}, func)`)
- a filter function (`.catch(function (err) {return err.statusCode === 404}, func)`)

#### .catchLater()

Prevents an error from being thrown if the promise is rejected but does not yet have a rejection handler (see [Unhandled Rejections](#unhandled-rejections)).

## License

[MIT](https://github.com/JoshuaWise/jellypromise/blob/master/LICENSE)
