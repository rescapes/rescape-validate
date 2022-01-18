import {v} from './functionValidator.js';
import PropType from 'prop-types';
import {expectValidationError} from './validatorHelpers.js';
import * as R from 'ramda';

/**
 * Created by Andy Likuski on 2017.08.16
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

describe('functionValidator', () => {
  const func = R.curry((type, ret, obj) => ({type, ret, obj}));

  /**
   * Wraps a function in a validator.
   * This makes the function return Validation.success
   * or Validation.failure depending on if the right type
   * of arguments are passed in or not.
   */
  const validateTypesFunc = v(func, [
    ['type', [String]],
    ['ret', [Object, String]],
    ['obj', [Object]]
  ], 'funky');


  test('argument as type validator successful', () => {
    const fooValidateFunc = validateTypesFunc('FOO', {foo: 'foo', bar: 'bar'});
    expect(
      fooValidateFunc({foo: 'foo', bar: 'bar', zar: 'zar'})
    ).toEqual(
      {type: 'FOO', ret: {foo: 'foo', bar: 'bar'}, obj: {foo: 'foo', bar: 'bar', zar: 'zar'}}
    );
  });

  test('argument as type validator failing', () => {
    const errors = expectValidationError(() => validateTypesFunc(null, 1, null));
    expect(
      errors
    ).toEqual(
      [
        'Function funky, Requires type as one of String, but got null',
        'Function funky, Requires ret as one of Object, String, but got 1',
        'Function funky, Requires obj as one of Object, but got null'
      ]
    );
  });

  const validatePropTypesFunc = v(func, [
    ['type', PropType.string.isRequired],
    ['ret', PropType.oneOfType([PropType.object, PropType.string])],
    ['obj', PropType.object.isRequired]
  ], 'funky');

  test('argument as propType validator successful', () => {
    const fooValidateFunc = validatePropTypesFunc('FOO', {foo: 'foo', bar: 'bar'});
    expect(
      fooValidateFunc({foo: 'foo', bar: 'bar', zar: 'zar'})
    ).toEqual(
      {type: 'FOO', ret: {foo: 'foo', bar: 'bar'}, obj: {foo: 'foo', bar: 'bar', zar: 'zar'}}
    );
  });

  test('argument as propType validator failing', () => {
    const errors = expectValidationError(
      () => validatePropTypesFunc(null, 1, null)
    );
    expect(errors).toEqual(
      [
        'Error: The location `type` is marked as required in `funky`, but its value is `null`.',
        'Error: Invalid location `ret` supplied to `funky`, expected one of type [object, string].',
        'Error: The location `obj` is marked as required in `funky`, but its value is `null`.'
      ]
    );
  });

  test('Mismatch of function declaration and proptype declaration', () => {
    const funky = R.curry((type, ret) => ({type, ret}));
    const expectedItems = [
      ['type', PropType.string.isRequired],
      ['ret', PropType.oneOfType([PropType.object, PropType.string])],
      ['obj', PropType.object.isRequired]
    ];
    const errors = expectValidationError(
      // Even though the declaration causes an error, it's not thrown until we try to call the function with args
      () => v(funky, expectedItems, 'funky')('dont', {matter: 'at all'})
    );
    expect(errors).toEqual([
      `Error: Function funky: argument length ${R.length(funky)} and/or expectedItems length 3 is not matched by validators' length ${R.length(expectedItems)}:\n${JSON.stringify(expectedItems, null, 2)})`
    ]);
  });
});
