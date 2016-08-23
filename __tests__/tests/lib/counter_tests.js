import { expect } from 'chai';
import { PyropeActions } from '../../../lib';
import { resetDatabase, createUser } from '../../test_helper';
import { TEST_TIMEOUT, tablePrefix, tableSuffix } from '../../test_helper';

const UserActions = new PyropeActions({
  tablePrefix,
  tableName: 'users',
  tableSuffix
});

describe('DynamoDB atomic counters', function() {
  describe('create() -> count()', function() {
    let u1, u2, u3, u4, u5;
    
    this.timeout(TEST_TIMEOUT);
    before(() => resetDatabase());
    
    it('starts with count = 0', function() {
      return UserActions.count()
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
        .then(() => UserActions.count())
        .then(res => {
          expect(res).to.equal(5);
        })
    });
    
    it('deletes 2 users, count = 3', function() {
      return UserActions.destroy({index: {uuid: u1.uuid}})
        .then(() => UserActions.destroy({index: {uuid: u2.uuid}}))
        .then(() => UserActions.count())
        .then(res => {
          expect(res).to.equal(3);
        })
    });
  
    it('fails to delete user and counter remains the same', function() {
      return UserActions.destroy({index: {uuid: '123'}})
        .then(() => UserActions.count())
        .then(res => {
          expect(res).to.equal(3);
        })
    });
  });
});