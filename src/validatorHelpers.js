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
import Result from 'folktale/result/index.js';
import * as util from 'util';

/**
 * Pure function validation wrapper returning Result
 * @param {Function} func The function to validate against and call with the validated
 * items.
 * The expectedItems and actualItems must be the length of this function's number of arguments.
 * If validating an object this can be a function created that expects each property
 * of the object and simply returns the object
 * @param {[[string, *]]} expectedItems An array of pairs of expected items, either exact matches
 * or a structure that can be used for validation using itemValidator. Each pair is a name
 * and a value. The name is only used for error messages.
 *
 * For a function argument validation, for instance:
 * ['param1', [Object, String]] to call itemValidator('param1', [Object, String]) for function argument
 * validation.
 *
 * To validate an object convert it to pairs before passing as expectedItems
 *
 * @param {Function} itemValidator in the form (descriptor, name, expected, actual) => Validation.success|failure
 * A validator that compares and array or object of expected to an array of actual.
 *
 * @param {*} descriptor Name of thing being validated. This could be the function name
 * or potentially the thing passed in to validate. It is only used for error messages
 * @returns {Function} A function that expects the same arguments in number as func (not an array0. When
 * called with those arguments, the function returns a Validation.success if all validations
 * pass or a Validation.failure with messages for all of the
 * failing validations
 */
const validateItems = (func, expectedItems, itemValidator, descriptor) => {
  // useWith returns a function that expects sequence, in this case the actual parameters to validate.
  // Each expected parameter value is given to a curried validate function as the value parameter (the forth
  // value of the itemValidator)
  // useWith applies the results of all the validate calls to Validation.liftAN,
  // which in turn returns a Validation.failure or else calling func and wrapping the result in a Validation.success
  const validator = R.ifElse(
    itemsLength => R.and(
      R.equals(R.length(func), itemsLength),
      R.equals(R.length(expectedItems), itemsLength)
    ),
    // Return this function, which expects the pairs of items
    len => (...a) => {
      // Fail if the argumnet length is wrong
      if (R.not(R.equals(R.length(a), R.length(expectedItems)))) {
        const message = `For function ${descriptor} wrong number of arguments ${R.length(a)} provided. Expected ${R.length(expectedItems)}. Args provided: ${util.inspect(a)}`;
        return Validation.failure([
          {
            message,
            error: new Error(message)
          }
        ]);
      }
      // Check the type of each arg
      const successFailure = R.useWith(
        Validation.liftAN(len, func),
        R.map(([expectedKey, expectedValue]) => itemValidator(descriptor, expectedKey, expectedValue), expectedItems)
      )(...a);
      // Failed if anything weird happened
      if (typeof successFailure.value === 'undefined') {
        const message = `For function ${descriptor} unacceptable undefined returned value ${JSON.stringify(successFailure)}`;
        return Validation.failure([
          {
            message,
            error: new Error(message)
          }
        ]);
      }
      return successFailure;
    },
    // Return a function here since this will be called with the actual
    // parameters, which we'll ignore. It would be better to short-circuit
    // the Compose call in vResult but I don't want to deal with this special Validation container
    len => () => {
      // Generate an error so we have a stack trace
      let error = null;
      const message = `Function ${func.name || descriptor}: argument length ${R.length(func)} and/or expectedItems length ${R.length(expectedItems)} is not matched by validators' length ${len}:\n${JSON.stringify(expectedItems, null, 2)})`;
      try {
        throw new Error(message);
      } catch (e) {
        error = e;
      }
      return Validation.failure([
        {
          message,
          error
        }
      ]);
    }
  )(R.length(expectedItems));
  return (...args) => {
    return validator(...args);
  };
};

// See validateItems. This simply converts Validation to Result an maintains the curryability
export const validateItemsResult = (func, expectedItems, itemValidator, descriptor) => {
  // Return a function that curries until all of func's arguments are received
  return (...args) => {
    return R.curryN(
      func.length,
      (...a) => {
        return R.compose(
          // Then fold the Validation.Success|Failure into Result.Ok|Error
          // (predefined fold function has an error in it)
          o => {
            return R.ifElse(
              obj => obj.isSuccess,
              obj => Result.Ok(obj.value),
              obj => Result.Error(obj.value)
            )(o);
          },
          // Pass all the arguments to the result of this validator function
          (...aa) => validateItems(func, expectedItems, itemValidator, descriptor)(...aa)
        )(...a);
      }
    )(...args);
  };
};

/**
 * Test helper to extract validation error messages
 * @param {Function} validatorCall Unary function expected to throw a validation error
 * @return {String[]} Error messages
 **/
export const expectValidationError = validatorCall => {
  try {
    validatorCall();
  } catch (e) {
    // Extract error message strings
    return R.map(str => R.slice(0, R.indexOf(', Stack', str), str), R.split('; ', e.message));
  }
  throw Error('No validation error occured');
};
