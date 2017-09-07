const R = require('ramda');
const {v} = require('./functionValidator');

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
  const func = R.curry((type, ret, obj) => ({good: 'job'}));

  /**
   * Wraps a function in a validator.
   * This makes the function return Validation.success
   * or Validation.failure depending on if the right type
   * of arguments are passed in or not.
   */
  const validateFunc = v(func, [
    ['type', [String]],
    ['ret', [Object, String]],
    ['obj', [Object]]
  ], 'funky');

  test('argument validator successful', () => {
    const fooValidateFunc = validateFunc('FOO', {foo: 'foo', bar: 'bar'});
    expect(
      fooValidateFunc({foo: 'foo', bar: 'bar', zar: 'zar'})
    ).toEqual(
      {good: 'job'}
    );
  });

  test('argument validator failing', () => {
    expect(
      () => validateFunc(null, 1, null)
    ).toThrow(
      new Error([
        'Function funky, Requires type as one of String, but got null',
        'Function funky, Requires ret as one of Object, String, but got 1',
        'Function funky, Requires obj as one of Object, but got null'
      ])
    );
  });
});
