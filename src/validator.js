const Validation = require('ramda-fantasy-validation');
const R = require('ramda');
const {Either} = require('ramda-fantasy');
const {throwIfLeft} = require('rescape-ramda').throwing;
const prettyFormat = require('pretty-format');

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


/**
 * Pure function validation wrapper returning Either
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
 * @returns {Function} A function that expects the same arguments as func. When
 * called with those arguments, the function returns a Validation.success if all validations
 * pass or a Validation.failure with messages for all of the
 * failing validations
 */
const validateItems = (func, expectedItems, itemValidator, descriptor) =>
  // useWith returns a function that expects sequence, in this case the actual parameters to validate.
  // Each expected parameter value is given to a curried validate function as the value parameter (the forth
  // value of the itemValidator)
  // useWith applies the results of all the validate calls to Validation.liftAN,
  // which in turn returns a Validation.failure or else calling func and wrapping the result in a Validation.success
  R.ifElse(
    () => R.equals(R.length(func), R.length(expectedItems)),
    () => R.useWith(
      Validation.liftAN(R.length(expectedItems), func),
      R.map(([expectedKey, expectedValue]) => itemValidator(descriptor, expectedKey, expectedValue), expectedItems)
    ),
    // Return a function here since this will be called with the actual
    // parameters, which we'll ignore. It would be better to short-circuit
    // the Compose call in vEither but I don't want to deal with this special Validation container
    () => () => Validation.failure(
      `Function ${func.name}: argument length ${R.length(func)} is not matched by validators' length ${R.length(expectedItems)}:\n${prettyFormat(expectedItems)})`
    )
  )();

// See validateItems. This simply converts Validation to Either
const validateItemsEither = (func, expectedItems, itemValidator, descriptor) =>
  // Return a function that curries until all of func's arguments are received
  R.curryN(
    func.length,
    R.compose(
      // Then fold the Validation.Success|Failure into Either.Right|Left
      // (predefined fold function has an error in it)
      // TODO this should be fixed now
      R.ifElse(
        obj => obj.isSuccess,
        obj => Either.Right(obj.value),
        obj => Either.Left(obj.value)),
      // Pass all the arguments to the result of this validator function
      validateItems(func, expectedItems, itemValidator, descriptor)
    )
  );


/**
 * Validation function that throws on Error. Since validation is always
 * a coding error, not an IO error, we should never expect the caller to handle it
 * @param {Function} func The function to validate
 * @param {[Array]} expectedItems Array of arrays. Each array contains the name of the argument and an
 * array of allowed types (e.g. ['arg1', [Object, String]])
 * @param {String} [funcName] Optional name of the function. Defaults to func.name
 * @returns {Function} A function expecting the actual arguments to validate, which in turn returns
 * a results of the function call (if valid) or throws if not
 */
module.exports.v = (func, expectedItems, funcName = func.name) =>
  R.curryN(
    func.length,
    R.compose(
      throwIfLeft,
      validateItemsEither(func, expectedItems, validateArgument, funcName)
    )
  );

/**
 * Validates a function argument using Validation
 * @param {String} funcName The name of the function being validated, only for Error messages
 * @param {String} name The name of the argument, only for Error messages
 * @param {[Type]} actual Javascript types, e.g. Number, Object, etc allowed as the type
 * @param {Object} value The actual argument value
 * @returns {Validation.Success|Validation.Failure} A Validation.Success or Validation.Failure
 */
const validateArgument = R.curry((funcName, name, types, actual) =>
  R.ifElse(
    v => R.any(type => R.is(type, v), types),
    Validation.of,
    _ => Validation.failure([`Function ${funcName}, Requires ${name} as one of ${R.join(', ', R.map(t => R.type(t()), types))}, but got ${prettyFormat(actual)}`])
  )(actual)
);

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
module.exports.vMergeScope = R.curry((scope, obj) => {
  const keys = R.keys(scope);
  const toPairs = o => R.map(key => [key, o[key]], keys);
  const toValues = o => R.map(key => o[key], keys);
  const ln = R.length(keys);
  const actualValues = toValues(obj);
  return R.curryN(
    ln,
    R.compose(
      throwIfLeft,
      // Pass actual so we can dump the object in an Error message
      validateItemsEither(
        // The merge function
        // Convert object to pairs to make function expecting that many arguments and
        // returning the merge of the obj and scope
        // This matches the expected signature of validateItemsEither, which expects
        // to apply the each argument to a function so that it can accumulate validation errors
        R.curryN(ln, (...values) => R.merge(obj, scope)),
        // expected items
        toPairs(scope),
        // function to evaluate each item
        validateProp,
        // Use the object as the descriptor
        obj
      )
    )
  )(...actualValues);
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
    val => Validation.failure([`${prettyFormat(obj)}, Requires ${prop} to equal ${prettyFormat(expected)}, but got ${prettyFormat(val)}`])
    // If actual is an object with an id, map it to the id. Otherwise assume it's a primitive
  )(R.propOr(actual, 'id', actual))
);

const validateObject = (expectedItems, itemValidator, descriptor) =>
  R.mapObjIndexed((expectedValue, expectedKey) => itemValidator(descriptor, expectedKey, expectedValue), expectedItems)

const validateObjectEither = (expectedItems, itemValidator, descriptor) =>
  R.compose(
    // Then fold the Validation.Success|Failure into Either.Right|Left
    // (predefined fold function has an error in it)
    // TODO this should be fixed now
    R.ifElse(
      obj => obj.isSuccess,
      obj => Either.Right(obj.value),
      obj => Either.Left(obj.value)),
    // Pass all the arguments to the result of this validator function
    validateObject(func, expectedItems, itemValidator, descriptor)
  );

/**
 * Validates an object's props against a prop-types object
 */
module.exports.vProps = (propTypes, props, componentName='Unspecified') =>
  R.compose(
    throwIfLeft,
    // Pass actual so we can dump the object in an Error message
    validateObjectEither(
      // Unlike other validators, we only have one argument--the props, so we don't need a currying function
      // This could be modified to split up the props into args if they we allowed to be built up and then
      // only validated once all were present. The problem with that is that this validator is checking for
      // missing props as well as incorrect types, so currying them as function arguments doesn't really work
      R.identity,
      // expected types
      propTypes,
      // function to check
      checkPropType,
      componentName
    )
  )(props)
);


/**
 * Modified from https://github.com/facebook/prop-types/issues/34
 * @param {String} componentName
 * @param {String} propName
 * @param {Function} propType
 * @param {Object} prop
 * @returns [Validation] Validation success or failure
 */
const checkPropType = (componentName, propName, propType, prop) => {
  if (typeof(propType) !== 'function')
    return Validation.failure('TypeChecker should be a function');
  const error = propType([prop], propName, componentName, 'location', null, 'SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED');
  // specified using prop-types version 15.5.8 only in package.json
  if (error instanceof Error)
    return Validation.failure(`Failed ${prop} for component ${componentName} type: ${error.message}`);
  return Validation.success(prop)
}