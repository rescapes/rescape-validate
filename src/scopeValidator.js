/**
 * Created by Andy Likuski on 2017.08.16
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

import Validation from 'ramda-fantasy-validation';
import * as R from 'ramda';
import {mappedThrowIfResultError} from '@rescapes/ramda';
import {validateItemsResult} from './validatorHelpers.js';

/**
 * Validates that the given object has properties matching the given scope, then merges the scope.
 * The object may omit the scope parameters, but they must not be different.
 * The properties of obj are always expected to be objects with ids.
 * The scope properties are always expected to be ids
 * @param {Object} scope An object of id properties (e.g. {user: 123, project: 456})
 * @param {Object} obj The object to validate. It must contains properties whose
 * ids match the scope (e.g. {..., user: {name: 'kenny', id: 123}, project: {name: 'friendly', id: 456})
 * @returns {Object} The merged obj with the scope, or throws if any validation fails
 */
export const vMergeScope = R.curry((scope, objct) => {
  const keys = R.keys(scope);
  const toPairs = o => R.map(key => [key, o[key]], keys);
  const toValues = o => R.map(key => o[key], keys);
  const ln = R.length(keys);
  const actualValues = toValues(objct);
  // Call validateItemsResult and then throw if the Result is an Result.Error, meaning an error occured
  return R.compose(
    // If we got a Result.Ok extract the value. We won't get her if we throw on the previous statment
    result => result.unsafeGet(),
    mappedThrowIfResultError(({obj, prop, expected, actual, error: {stack}}) => `${JSON.stringify(obj, null, 2)}, Requires ${prop} to equal ${JSON.stringify(expected, null, 2)}, but got ${JSON.stringify(actual, null, 2)}, Stack: ${stack}`),
    // Pass actual as variadic arguments to the resulting function of validateItemsResult
    // so we can dump the object in an Error message
    values => R.apply(validateItemsResult(
      // The merge function
      // Convert object to pairs to make function expecting that many arguments and
      // returning the merge of the obj and scope
      // This matches the expected signature of validateItemsResult, which expects
      // to apply the each argument to a function so that it can accumulate validation errors
      R.curryN(ln, () => R.mergeRight(objct, scope)),
      // expected items
      toPairs(scope),
      // function to evaluate each item
      validateProp,
      // Use the object as the descriptor
      objct
    ), values)
  )(actualValues);
});

/**
 * Validates an object property value using Validation.
 * The property must be undefined, equal the expected value, or have an id that equals the expected value
 * @param {Object} obj The object being validated, only for Error messages
 * @param {String} prop The property being validated, only for Error messages
 * @param {*} expected The expected value of object for the given property. This value is always an id
 * @param {*) actual The actual value or object with the id of the object for the given property.
 * It can be undefined to indicate that the scope should be used. This would happen if a user created
 * a new object that didn't specify the current user, project, etc. The scope would fill in the values later
 * @returns {Validation.Success|Validation.Failure} A Validation.Success or Validation.Failure
 */
const validateProp = R.curry((obj, prop, expected, actual) =>
  R.ifElse(
    // undefined, object with a matching id, or the matching value itself
    R.either(R.isNil, R.equals(expected)),
    // Wrap in Validation
    Validation.of,
    // Create a Validation failure
    val => {
      // Generate an error so we have a stack trace
      let error = null;
      try {
        throw new Error('Validation error');
      } catch (e) {
        error = e;
      }
      return Validation.failure([
        {
          obj,
          prop,
          expected,
          actual: val,
          error
        }
      ]);
    }
    // If actual is an object with an id, map it to the id. Otherwise assume it's a primitive
  )(R.propOr(actual, 'id', actual))
);
