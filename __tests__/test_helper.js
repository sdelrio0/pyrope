import { exec } from 'child_process';
import * as pyrope from '../lib';
import { v4 } from 'uuid';
import dynalite from 'dynalite';
import Promise from 'bluebird';

export const dynaliteServer = Promise.promisifyAll(dynalite({path: './.dynamodb', createTableMs: 1, updateTableMs: 1, deleteTableMs: 1}));
export const DYNALITE_PORT = 8000;
export const TEST_TIMEOUT = 4000;

export const dynaliteSetup = () => dynaliteServer.listenAsync(DYNALITE_PORT);

export const dynaliteTeardown = () => dynaliteServer.closeAsync();

// Set environment variables
process.env.NODE_ENV = 'test';
process.env.AUTH_TOKEN_SECRET = 'secret';

console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
console.log('Node ENV: ', process.env.NODE_ENV);

export const resetDatabase = ( ) => {
  return new Promise((resolve, reject) => {
    exec('ddb clear -d ./__tests__/db/migrations -c ./__tests__/db/schema.json && ddb migrate -d ./__tests__/db/migrations -c ./__tests__/db/schema.json', {env: Object.assign({}, process.env, {NODE_ENV: 'test'})}, (err, stdout, stderr) => {
      if (err) return reject(stdout);
      resolve(stdout);
    })
  });
};

export const createItem = (tableName, attributes) =>
  pyrope.create({
    tableName: `_test_${tableName}`,
    attributes: {
      ...attributes
    }
  });

export const createUser = (attributes) => createItem('users', attributes);
export const createContact = (attributes) => createItem('contacts', attributes);
export const createOrganization = (attributes) => createItem('organizations', attributes);
export const createTransaction = (attributes) => createItem('transactions', attributes);
export const createOperation = (attributes) => createItem('operations', attributes);

export const createUserRecursive = (attributes, count) => {
  return new Promise((resolve, reject) => {
    createUser({...attributes, username: attributes.username + count})
      .then(() => {
        if(--count > 0) {
          createUserRecursive(attributes, count)
            .then(res => resolve(res))
            .catch(err => reject(err))
        } else {
          resolve()
        }
      })
      .catch(err => reject(err));
  });
};