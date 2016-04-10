<a href="https://promisesaplus.com/"><img src="https://promisesaplus.com/assets/logo-small.png" align="right" /></a>
# jellypromise

This is an implementation of Promises that achieves the following design goals:
- Tiny size (3.24 kB minified and gzipped)
- Fast performance (almost as fast as [bluebird](https://github.com/petkaantonov/bluebird/))
- A superset of the [ES6 Promise](http://www.ecma-international.org/ecma-262/6.0/#sec-promise-objects)
- Has a very useful, carefully-selected set of utilities, without bloat
- Logs unhandled errors by default (the opposite of what [then/promise](https://github.com/then/promise) does), provides long stack traces, and provides utilities for useful error handling patterns

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

By default, long stack traces and warnings are turned on for superior debugging capabilities. However, if `process.env.NODE_ENV === 'production'`, they will be turned off for performance reasons.

You can also exclude these debugging features by using:

```js
var Promise = require('jellypromise/production');
```

Setting `process.env.NODE_ENV` only works in Nodejs. Even if you are using [browserify](https://github.com/substack/node-browserify), to use production mode in the browser, you must require `jellypromise/production`, as shown above.


# API

##### new Promise(*handler*)

This creates and returns a new promise. The `handler` must be a function with the following signature: `function handler(function *resolve*, function *reject*)`

 1. `resolve` should be called with a single argument. If it is called with a non-promise value then the promise is fulfilled with that value. If it is called with a promise, then the constructed promise takes on the state of that promise.
 2. `reject` should be called with a single argument. The returned promise will be rejected with that argument.

##### *static* Promise.resolve(*value*) -> *promise*

Creates a promise that is resolved with the given `value`. If you pass a promise or promise-like object, the returned promise takes on the state of that promise-like object (rejected or fulfilled).

##### *static* Promise.reject(*value*) -> *promise*

Creates a promise that is rejected with the given `value` (usually an `Error` object) as its rejection reason.

##### *static* Promise.race(*iterable*) -> *promise*

Returns a promise that resolves or rejects with the same value/exception as the first resolved/rejected promise in the `iterable` argument.

Non-promise values in the `iterable` are treated like already-fulfilled promises.

##### *static* Promise.all(*iterable*) -> *promise*

Returns a promise for an `iterable` of promises. The returned promise is rejected if any of promises in `iterable` are rejected. Otherwise, it is resolved with an array of each fulfillment value, respectively.

Non-promise values in the `iterable` are treated like already-fulfilled promises.

```js
Promise.all([Promise.resolve('a'), 'b', Promise.resolve('c')])
  .then(function (results) {
    assert(results[0] === 'a')
    assert(results[1] === 'b')
    assert(results[2] === 'c')
  })
```

##### *static* Promise.any(*iterable*) -> *promise*

Returns a promise for an `iterable` of promises. It is resolved with the value of the first resolved promise in `iterable`. If all of the given promises reject, it is rejected with the last rejection reason.

Non-promise values in the `iterable` are treated like already-fulfilled promises.

##### *static* Promise.props(*object*) -> *promise*

Like `Promise.all`, but for an object's properties, instead of iterated values. Returns a promise that is resolved with an object with fulfillment values at respective keys to the original `object`. Only the `object`'s own enumerable properties are considered (those retrieved by [`Object.keys`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys)).

Non-promise values in the `iterable` are treated like already-fulfilled promises.

```js
Promise.props({users: getUsers(), news: getNews()})
  .then(function (results) {
    console.log(results.users)
    console.log(results.news)
  })
```

##### *static* Promise.partition(*iterable*, [*handler*]) -> *promise*

Waits for each promise in the `iterable` argument to either resolve or reject, and then invokes the `handler` function with the following signature: `function handler(Array *resolvedValues*, Array *rejectionReasons*)`

 1. `resolvedValues` is an array containing each fulfillment value of each resolved promise from the `iterable` argument.
 2. `rejectionReasons` is an array containing each rejection reason of each rejected promise from the `iterable` argument.

Both `resolvedValues` and `rejectionReasons` are sorted by first-resolved/rejected to last-resolved/rejected.

The promise returned by `Promise.partition` is resolved with the return value of the `handler`, or is rejected if `handler` throws an error.

If a `handler` argument is not provided (or is not a function), the returned promise is simply resolved with `resolvedValues`. In this case, `rejectionReasons` are discarded.

Non-promise values in the `iterable` are treated like already-fulfilled promises.

##### *static* Promise.iterate(*iterable*, [*callback*]) -> *promise*

Asynchronously iterates through each value in `iterable`, in order, and invokes the `callback` function for each value. Promises yielded by `iterable` are awaited before their values are passed to the next invocation of `callback`. If `callback` returns a promise, the next iteration is delayed until that promise resolves.

`Promise.iterate` returns a promise that is resolved when `iterable` is done being iterated through. Its fulfillment value is always `undefined`.

If any promises given by `iterable` are rejected, or if `callback` throws, or if `callback` returns a promise that is rejected, the returned promise is rejected and iteration is stopped.

`Promise.iterate` allows you to potentially iterate indefinitely if `iterable` never stops producing values. Each iteration takes place asynchronously, so the program will never be blocked by infinite iteration.

If a `callback` function is not provided, iteration still takes place, but without invoking a `callback` on each value.

Non-promise values in the `iterable` are treated like already-fulfilled promises.

##### *static* Promise.join(*valueA*, *valueB*, [*handler*]) -> *promise*

A simpler, more performant alternative to `Promise.all`. This function waits for both `valueA` and `valueB` to resolve (if they are not promises, they are resolved right away), and then invokes `handler` with the fulfillment values of `valueA` and `valueB` as its two arguments, respectively.

The returned promise is resolved with the return value of the `handler`.

If either `valueA` or `valueB` rejects, or if `handler` throws, or if `handler` returns a rejected promise, the returned promise rejects with the associated exception.

If a `handler` function is not provided, the returned promise is simply resolved with the fulfillment value of `valueA` (after both `valueA` and `valueB` have resolved)

##### *static* Promise.isPromise(*value*) -> *boolean*

Returns either `true` or `false`. Determines whether `value` is a promise-like object (i.e., it has a `.then` method).

##### *static* Promise.promisify(*function*) -> *function*

**WARNING: This function is not available in the browser!**

Takes a `function` which accepts a node style callback and returns a new function that returns a promise instead.

```js
var fs = require('fs')
var read = Promise.promisify(fs.readFile)

var promise = read('foo.json', 'utf8')
  .then(function (str) {
    var json = JSON.parse(str)
  })
```

##### *static* Promise.nodeify(*function*) -> *function*

**WARNING: This function is not available in the browser!**

Takes a promise-returning `function`, and returns a new function that instead accepts a node style callback as its last argument. The newly created function will always return undefined.

```js
var callbackAPI = Promise.nodeify(promiseAPI)

callbackAPI('foo', 'bar', function (err, result) {
  // handle error or result here
})
```

##### .then([*onFulfilled*], [*onRejected*]) -> *promise*

This method conforms to the [Promises/A+ spec](http://promises-aplus.github.io/promises-spec/).

If you are new to promises, the following resources are available:
 - [Matt Greer's promise tutorial](http://www.mattgreer.org/articles/promises-in-wicked-detail/)
 - [HTML5 Rocks's promise tutorial](http://www.html5rocks.com/en/tutorials/es6/promises/)
 - [Promises.org's introduction to promises](https://www.promisejs.org/)
 - [David Walsh's article on promises](https://davidwalsh.name/promises)

Non-function arguments are ignored. In other words, when this promise resolves or rejects, the promise returned by `.then` would be resolved or rejected with the same value/exception.

##### .catch([*...predicates*], *onRejected*) -> *promise*

Sugar for `.then(null, onRejected)`, to mirror `catch` in synchronous code.

If any `predicates` are specified, the `onRejected` handler only catches exceptions that match one of the `predicates`.

A `predicate` can be...
- an `Error` class: `.catch(TypeError, SyntaxError, func)`
- an object defining required property values: `.catch({code: 'ENOENT'}, func)`
- a filter function: `.catch(function (err) {return err.statusCode === 404}, func)`

##### .catchLater() -> *this*

Prevents an error from being logged if the promise is rejected but does not yet have a rejection handler (see [Unhandled Rejections](#unhandled-rejections)).

##### .finally(*handler*) -> *promise*

Pass a `handler` that will be called regardless of this promise's fate. The `handler` is invoked with no arguments, and cannot change the promise chain's fulfillment value or rejection reason. If `handler` returns a promise, the promise returned by `.finally` will not be fulfilled/rejected until that promise is resolved.

This method is primarily used for cleanup after asynchronous operations.

##### .tap(*handler*) -> *promise*

Like `.finally`, but the `handler` will not be called if this promise is rejected. The `handler` cannot change the promise chain's fulfillment value, but it can delay chained promises by returning a promise (just like `.finally`).

This method is primarily used for side-effects.

##### .else([*...predicates*], *value*) -> *promise*

Sugar for `.catch(function () {return *value*})`. This method is primarily used for providing default values on a rejected promise chain.

##### .delay(*milliseconds*) -> *promise*

Returns a new promise chained from this one, whose fulfillment is delayed by the specified number of `milliseconds` from when it would've been fulfilled otherwise. Rejections are not delayed.

##### .timeout(*milliseconds*, [*reason*]) -> *promise*

Returns a new promise chained from this one. However, if this promise does not resolve within the specified number of `milliseconds`, the returned promise rejects with a `TimeoutError`.

If you specify a string `reason`, the `TimeoutError` will have `reason` as its message. Otherwise, a default message will be used. If `reason` is an `instanceof Error`, it is used instead of a `TimeoutError`.

`TimeoutError` is available at `Promise.TimeoutError`.

##### .log(*prefix*) -> *promise*

Sugar for `.then(function (value) {console.log(value)})`. If `prefix` is provided, it is prepended to the logged `value`, separated by a space character.

## License

[MIT](https://github.com/JoshuaWise/jellypromise/blob/master/LICENSE)
