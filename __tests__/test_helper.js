import jwt from 'jsonwebtoken';
import { exec } from 'child_process';
import * as dynamo from '../lib';
import { v4 } from 'uuid';
import dynalite from 'dynalite';

const dynaliteServer = dynalite({createTableMs: 0});
const DYNALITE_PORT = 8000;

// Start DynamoDB test server
// dynaliteServer.listen(DYNALITE_PORT, function(err) {
//   if (err) throw err;
//   console.log(`Dynalite started on port ${DYNALITE_PORT}`);
// });

// Set environment variables
process.env.NODE_ENV = 'test';
process.env.AUTH_TOKEN_SECRET = 'secret';

console.log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
console.log('Node ENV: ', process.env.NODE_ENV);

// Builds an array of expressions
export const useRole = (role) => {
  switch(role) {
    case 'root':
      return jwt.sign({username: 'root', role: 'root'}, process.env.AUTH_TOKEN_SECRET, {noTimestamp: true});
    case 'admin':
      return jwt.sign({username: 'admin', role: 'admin'}, process.env.AUTH_TOKEN_SECRET, {noTimestamp: true});
    case 'user':
      return jwt.sign({username: 'user', role: 'user'}, process.env.AUTH_TOKEN_SECRET, {noTimestamp: true});
    case 'guest':
      return jwt.sign({username: '_guest', role: 'guest'}, process.env.AUTH_TOKEN_SECRET, {noTimestamp: true});
    default:
      throw new Error(`Unknown role '${role}'`);
  }
};
 
export const resetDatabase = () => {
  return new Promise((resolve, reject) => {
    exec('ddb clear -d ./__tests__/db/migrations -c ./__tests__/db/schema.json && ddb migrate -d ./__tests__/db/migrations -c ./__tests__/db/schema.json', {env: Object.assign({}, process.env, {NODE_ENV: 'test'})}, (err, stdout, stderr) => {
      if (err) return reject(stdout);
      resolve();
    })
  });
};

export const createItem = (tableName, attributes) =>
  dynamo.create({
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