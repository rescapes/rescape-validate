/**
 * Created by Andy Likuski on 2017.08.16
 * Copyright (c) 2017 Andy Likuski
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */
import * as R from 'ramda';
import {vMergeScope} from './scopeValidator.js';
import {expectValidationError} from './validatorHelpers.js';

describe('scope validation', () => {
  const scope = {user: 1, project: 2};
  test('scope validator successful', () => {
    // Values must match or be undefined
    const actual = {aardvark: 9, user: 1};
    expect(
      vMergeScope(scope, actual)
    ).toEqual(
      R.mergeRight(actual, scope)
    );
  });

  test('scope validator with objects successful', () => {
    // Values' ids must match the scope values or be undefined
    const actual = {aardvark: {id: 9}, user: {id: 1}};
    expect(
      vMergeScope(scope, actual)
    ).toEqual(
      R.mergeRight(actual, scope)
    );
  });

  test('validator failing', () => {
    const actual = {aardvark: 9, user: 5, project: 7};
    const errors = expectValidationError(
      () => vMergeScope(scope, actual)
    );
    expect(errors).toEqual(
      [
        `${JSON.stringify(actual, null, 2)}, Requires user to equal 1, but got 5`,
        `${JSON.stringify(actual, null, 2)}, Requires project to equal 2, but got 7`
      ]
    );
  });

  test('validator with objects failing', () => {
    const actual = {aardvark: {id: 9}, user: {id: 5}, project: {id: 7}};
    const errors = expectValidationError(
      () => vMergeScope(scope, actual)
    );
    expect(errors).toEqual(
      [
        `${JSON.stringify(actual, null, 2)}, Requires user to equal 1, but got 5`,
        `${JSON.stringify(actual, null, 2)}, Requires project to equal 2, but got 7`
      ]
    );
  });
});
