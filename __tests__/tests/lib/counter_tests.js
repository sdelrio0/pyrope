import { expect } from 'chai';
import * as dynamo from '../../../src/lib/dynamodb';
import { resetDatabase, createUser, createUserRecursive, createContact } from '../../test_helper';

const TEST_TIMEOUT = 3000;

describe('DynamoDB atomic counters', function() {
  describe('create() -> count()', function() {
    let u1, u2, u3, u4, u5;
    
    this.timeout(TEST_TIMEOUT);
    before(() => resetDatabase());
    
    it('starts with count = 0', function() {
      return dynamo.count({tableName: '_test_users'})
        .then(res => {
          expect(res).to.equal(0);
        })
    });
  
    it('creates 5 users, count = 5', function() {
      return createUser({}).then(u => u1 = u)
        .then(() => createUser({})).then(u => u2 = u)
        .then(() => createUser({})).then(u => u3 = u)
        .then(() => createUser({})).then(u => u4 = u)
        .then(() => createUser({})).then(u => u5 = u)
        .then(() => dynamo.count({tableName: '_test_users'}))
        .then(res => {
          expect(res).to.equal(5);
        })
    });
    
    it('deletes 2 users, count = 3', function() {
      return dynamo.destroy({tableName: '_test_users', index: {uuid: u1.uuid}})
        .then(() => dynamo.destroy({tableName: '_test_users', index: {uuid: u2.uuid}}))
        .then(() => dynamo.count({tableName: '_test_users'}))
        .then(res => {
          expect(res).to.equal(3);
        })
    });
  
    it('fails to delete user and counter remains the same', function() {
      return dynamo.destroy({tableName: '_test_users', index: {uuid: '123'}})
        .then(() => dynamo.count({tableName: '_test_users'}))
        .then(res => {
          expect(res).to.equal(3);
        })
    });
  });
});