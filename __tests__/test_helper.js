import { exec } from 'child_process';
import { PyropeActions } from '../lib';
import { v4 } from 'uuid';
import dynalite from 'dynalite';
import Promise from 'bluebird';

export const dynaliteServer = Promise.promisifyAll(dynalite({path: './.dynamodb', createTableMs: 1, updateTableMs: 1, deleteTableMs: 1}));
export const DYNALITE_PORT = 8000;
export const TEST_TIMEOUT = 5000;
export const tablePrefix = 'qtz-';
export const tableSuffix = '-test';

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

export const createItem = (tableName, fields) => {
  const actions = new PyropeActions({
    tablePrefix,
    tableName,
    tableSuffix,
  });
  
  return actions.create({fields})
};

export const createUser = (fields) => createItem('users', fields);
export const createContact = (fields) => createItem('contacts', fields);
export const createOrganization = (fields) => createItem('organizations', fields);
export const createTransaction = (fields) => createItem('transactions', fields);
export const createOperation = (fields) => createItem('operations', fields);

export const createUserRecursive = (fields, count) => {
  return new Promise((resolve, reject) => {
    createUser({...fields, username: fields.username + count})
      .then(() => {
        if(--count > 0) {
          createUserRecursive(fields, count)
            .then(res => resolve(res))
            .catch(err => reject(err))
        } else {
          resolve()
        }
      })
      .catch(err => reject(err));
  });
};