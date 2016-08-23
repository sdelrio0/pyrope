/**
 * Pyrope ORM - index.js
 */
import { ddb, ddbClient } from './core';
import PyropeActions from './actions';
import PyropeModel from './models';

export { PyropeModel, PyropeActions, ddb, ddbClient };