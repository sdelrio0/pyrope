import { expect } from 'chai';
import * as dynamo from '../../../src/lib/dynamodb';
import { resetDatabase, createUser, createContact } from '../../test_helper';

const TEST_TIMEOUT = 3000;
const DEBUG = true;

const log = (msg, json) => {if(DEBUG) {console.log(`${msg}\n${json ? JSON.stringify(json, null, 2) : ''}\n`)}};

xdescribe('DynamoDB errors', function() {
  let user, contact;
  
  this.timeout(TEST_TIMEOUT);
  before(() => resetDatabase());
  before(() => createUser({}).then(u => user = u));
  before(() => createContact({}).then(u => contact = u));
  
  describe('', function() {
    it('', function() {
      
      return dynamo.associate({
        tableName: '_test_contacts_users',
        items: [
          {
            key: 'user',
            uuid: user.uuid+'asss'
          },
          {
            key: 'contact',
            uuid: contact.uuid
          }
        ]
      })
        .then(res => log(`\nResult: \n${res}\n`, res))
        .catch(err => log(`\nError: \n${err}\n`, err))
        
    });
  });
});