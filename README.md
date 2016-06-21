<a href="https://promisesaplus.com/"><img src="https://promisesaplus.com/assets/logo-small.png" align="right" /></a>
# jellypromise

This is an implementation of Promises that achieves the following design goals:
- Tiny size (3.38 kB minified and gzipped)
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

However, in some situations, you may wish to refrain from adding a rejection handler until a later time. In these cases, you can use the `.catchLater()` utility method to suppress this behavior.

## Production Mode

By default, long stack traces and warnings are turned on for superior debugging capabilities. However, if you use production mode, they will be turned off for performance reasons.

To use production mode, just load the module this way:

```js
var Promise = require('jellypromise/production');
```

# API

## new Promise(*handler*)

This creates and returns a new promise. `handler` must be a function with the following signature:

`function handler(resolve, reject)`

 1. `resolve` is a function that should be called with a single argument. If it is called with a non-promise value then the promise is fulfilled with that value. If it is called with a promise, then the constructed promise takes on the state of that promise.
 2. `reject` is a function that should be called with a single argument. The returned promise will be rejected with that argument.

### .then([*onFulfilled*], [*onRejected*]) -> *promise*

This method conforms to the [Promises/A+ spec](http://promises-aplus.github.io/promises-spec/).

If you are new to promises, the following resources are available:
 - [Matt Greer's promise tutorial](http://www.mattgreer.org/articles/promises-in-wicked-detail/)
 - [HTML5 Rocks's promise tutorial](http://www.html5rocks.com/en/tutorials/es6/promises/)
 - [Promises.org's introduction to promises](https://www.promisejs.org/)
 - [David Walsh's article on promises](https://davidwalsh.name/promises)

If they are provided, `onFulfilled` and `onRejected` should be functions.

### .catch([*...predicates*], *onRejected*) -> *promise*

Sugar for `.then(null, onRejected)`, to mirror `catch` in synchronous code.

If any `predicates` are specified, the `onRejected` handler will only catch exceptions that match one of the `predicates`.

A `predicate` can be:
- an `Error` class
 - example: `.catch(TypeError, SyntaxError, func)`
- an object defining required property values
 - example: `.catch({code: 'ENOENT'}, func)`
- a filter function
 - example: `.catch(function (err) {return err.statusCode === 404}, func)`

### .catchLater() -> *this*

Prevents an error from being logged if the promise gets rejected but does not yet have a rejection handler (see [Unhandled Rejections](#unhandled-rejections)).

### .finally(*handler*) -> *promise*

Pass a `handler` that will be called regardless of this promise's fate. The `handler` will be invoked with no arguments, and it cannot change the promise chain's current fulfillment value or rejection reason. If `handler` returns a promise, the promise returned by `.finally` will not be settled until that promise is settled.

This method is primarily used for cleanup operations.

### .tap(*handler*) -> *promise*

Like `.finally`, but the `handler` will not be called if this promise is rejected. The `handler` cannot change the promise chain's fulfillment value, but it can delay chained promises by returning an unsettled promise (just like `.finally`). The handler is invoked with a single argument: the fulfillment value of the previous promise.

This method is primarily used for side-effects.

### .else([*...predicates*], *value*) -> *promise*

Sugar for `.catch(function () {return value})`. This method is used for providing default values on a rejected promise chain. Predicates are supported, just like with the `.catch` method.

### .delay(*milliseconds*) -> *promise*

Returns a new promise chained from this one, whose fulfillment is delayed by the specified number of `milliseconds` from when it would've been fulfilled otherwise. Rejections are not delayed.

### .timeout(*milliseconds*, [*reason*]) -> *promise*

Returns a new promise chained from this one. However, if this promise does not settle within the specified number of `milliseconds`, the returned promise will be rejected with a `TimeoutError`.

If you specify a string `reason`, the `TimeoutError` will have `reason` as its message. Otherwise, a default message will be used. If `reason` is an `instanceof Error`, it will be used instead of a `TimeoutError`.

`TimeoutError` is available at `Promise.TimeoutError`.

### .log([*prefix*]) -> *promise*

Sugar for:
```js
.then(function (value) {
  console.log(value)
  return value
})
```

If `prefix` is provided, it will be prepended to the logged `value`, separated by a space character.

### .inspect() -> *object*

Returns an object that describes the current state of the promise. The returned object is not live, and will not update over time—it's just a snapshot.

If the promise is:
 - pending, the descriptor will be `{ state: 'pending' }`
 - fulfilled, the descriptor will be `{ state: 'fulfilled', value: <fulfillmentValue> }`
 - rejected, the descriptor will be `{ state: 'rejected', reason: <rejectionReason> }`

In Node.js, you'll always see this descriptor object when passing a `jellypromise` to `console.log()`.

### .filter(*callback*, [*thisArg*]) -> *promise*

Used on a promise whose value is (or will be) an iterable object of promises or values (or a mix thereof). This method returns a new promise that will be fulfilled with an array of the values that pass the filter function `callback`. Promises returned by `callback` are awaited for (i.e., the promise returned by this method won't fulfill until all mapped promises have fulfilled as well).

If any of the iterable's promises are rejected, or if `callback` throws, or if `callback` returns a rejected promise, the promise returned by this method will be rejected.

`callback` has the following signature: `function callback(value, index, length)`

Values are passed through the `callback` as soon as possible. They are not passed in any particular order. However, you can see an item's position in the original iterable/array via the `index` argument of the `callback`.

### .map(*callback*, [*thisArg*]) -> *promise*

Similar to the `.filter` method, but instead of filtering the iterable/array, it transforms each value through the mapper `callback` function.

`callback` has the following signature: `function callback(value, index, length)`

Values are passed through the `callback` as soon as possible. They are not passed in any particular order. However, you can see an item's position in the original iterable/array via the `index` argument of the `callback`.

### .forEach(*callback*, [*thisArg*]) -> *promise*

Similar to the `.map` method, but instead of transforming each value in the iterable, the resulting array will always contain the same values as the original iterable. Unsettled promises returned from the `callback` function will still delay the overall fulfillment of the promise created from this method. This method is primarily used for side effects.

`callback` has the following signature: `function callback(value, index, length)`

Values are passed through the `callback` as soon as possible. They are not passed in any particular order. However, you can see an item's position in the original iterable/array via the `index` argument of the `callback`.

### .reduce(*callback*, [*initialValue*]) -> *promise*

Used on a promise whose value is (or will be) an iterable object of promises or values (or a mix thereof). The `callback` function is applied against an accumulator and each value yielded by the iterable, **in order**, to reduce it to a single value which will become the fulfillment value of the promise returned by this method.

If the `callback` function returns a promise, then the result of that promise will be awaited before continuing with the next iteration.

If any of the iterable's promises are rejected, or if `callback` throws, or if `callback` returns a rejected promise, the promise returned by this method will be rejected.

`callback` has the following signature: `function callback(previousValue, currentValue, currentIndex, length)`

### *static* Promise.resolve(*value*) -> *promise*

Creates a promise that is resolved with the given `value`. If you pass a promise or promise-like object, the returned promise takes on the state of that promise-like object (fulfilled or rejected).

### *static* Promise.reject(*value*) -> *promise*

Creates a promise that is rejected with the given `value` (usually an `Error` object) as its rejection reason.

### *static* Promise.race(*iterable*) -> *promise*

Returns a promise that will fulfill or reject with the same value/exception as the first fulfilled/rejected promise in the `iterable` argument.

Non-promise values in the `iterable` are treated like already-fulfilled promises.

### *static* Promise.all(*iterable*) -> *promise*

Returns a promise for an `iterable` of promises. The returned promise will be rejected if any of promises in `iterable` are rejected. Otherwise, it will be fulfilled with an array of each fulfillment value, respectively.

Non-promise values in the `iterable` are treated like already-fulfilled promises.

```js
Promise.all([Promise.resolve('a'), 'b', Promise.resolve('c')])
  .then(function (results) {
    assert(results[0] === 'a')
    assert(results[1] === 'b')
    assert(results[2] === 'c')
  })
```

### *static* Promise.any(*iterable*) -> *promise*

Returns a promise for an `iterable` of promises. It will be fulfilled with the value of the first fulfilled promise in `iterable`. If all of the given promises reject, it will be rejected with the rejection reason of the promise that rejected first.

Non-promise values in the `iterable` are treated like already-fulfilled promises.

### *static* Promise.props(*object*) -> *promise*

Like `Promise.all`, but for an object's properties instead of iterated values. Returns a promise that will be resolved with an object that has fulfillment values at respective keys to the original `object`. Only the `object`'s own enumerable properties are considered (those retrieved by [`Object.keys`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys)).

Non-promise values in the `iterable` are treated like already-fulfilled promises.

```js
Promise.props({users: getUsers(), news: getNews()})
  .then(function (results) {
    console.log(results.users)
    console.log(results.news)
  })
```

### *static* Promise.settle(*iterable*) -> *promise*

Given an `iterable` of promises, returns a promise that fulfills with an array of promise descriptor objects.

If the corresponding input promise is:
 - fulfilled, the descriptor will be `{ state: 'fulfilled', value: <fulfillmentValue> }`
 - rejected, the descriptor will be `{ state: 'rejected', reason: <rejectionReason> }`

Non-promise values in the `iterable` are treated like already-fulfilled promises.

### *static* Promise.iterate(*iterable*, *callback*) -> *promise*

Asynchronously iterates through each value in `iterable`, in order, and invokes the `callback` function for each value. If `iterable` yields a promise, that promise's fulfillment value will be awaited before being passed to `callback` for that iteration. If `callback` returns a promise, the next iteration will be delayed until that promise is fulfilled.

This function returns a promise that will be fulfilled when `iterable` is done producing values. Its fulfillment value will always be `undefined`.

If any promises yielded by `iterable` are rejected, or if `callback` throws, or if `callback` returns a rejected promise, then the returned promise will be rejected and iteration is stopped.

This function allows you to potentially iterate indefinitely (if `iterable` never stops producing values). As long as each iteration involves an asynchronous operation, the program will never be blocked by infinite iteration.

### *static* Promise.isPromise(*value*) -> *boolean*

Returns either `true` or `false`, whether `value` is a promise-like object (i.e., it has a `.then` method).

### *static* Promise.promisify(*function*) -> *function*

**NOTE: This function is not available in the browser!**

Takes a `function` which accepts a node style callback and returns a new function that returns a promise instead.

```js
var fs = require('fs')
var read = Promise.promisify(fs.readFile)

var promise = read('foo.json', 'utf8')
  .then(function (str) {
    var json = JSON.parse(str)
  })
```

### *static* Promise.nodeify(*function*) -> *function*

**NOTE: This function is not available in the browser!**

Takes a promise-returning `function`, and returns a new function that instead accepts a node style callback as its last argument. The newly created function will always return undefined.

```js
var callbackAPI = Promise.nodeify(promiseAPI)

callbackAPI('foo', 'bar', function (err, result) {
  // handle error or result here
})
```

## License

[MIT](https://github.com/JoshuaWise/jellypromise/blob/master/LICENSE)
