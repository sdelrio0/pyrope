import { filter } from 'underscore';
import { expect } from 'chai';

import { PyropeModel, PyropeActions } from '../../../lib';
import { resetDatabase, createUser, createContact, createOrganization, createTransaction, createOperation } from '../../test_helper';

import { UserType } from '../../collections/users/types';
import { ContactType } from '../../collections/contacts/types';
import { OrganizationType } from '../../collections/organizations/types';
import { OperationType } from '../../collections/operations/types';
import { TransactionType } from '../../collections/transactions/types';

import * as userResolvers from '../../collections/users/resolvers';
import * as contactResolvers from '../../collections/contacts/resolvers';
import * as organizationResolvers from '../../collections/organizations/resolvers';
import * as operationResolvers from '../../collections/operations/resolvers';
import * as transactionResolvers from '../../collections/transactions/resolvers';

import { validations as userValidations } from '../../collections/users/validations';
import { TEST_TIMEOUT, tablePrefix, tableSuffix } from '../../test_helper';

const User = new PyropeModel(UserType, {validations: userValidations, tablePrefix, tableSuffix});
const Contact = new PyropeModel(ContactType, {tablePrefix, tableSuffix});
const Organization = new PyropeModel(OrganizationType, {tablePrefix, tableSuffix});
const Operation = new PyropeModel(OperationType, {tablePrefix, tableSuffix});
const Transaction = new PyropeModel(TransactionType, {tablePrefix, tableSuffix});

const ContactsUsers = new PyropeActions({tablePrefix, tableSuffix, tableName: 'contacts_users'});
const ContactsOrganizations = new PyropeActions({tablePrefix, tableSuffix, tableName: 'contacts_organizations'});
const OperationsTransactions = new PyropeActions({tablePrefix, tableSuffix, tableName: 'operations_transactions'});

const DEBUG = true;

const log = (msg, json) => {if(DEBUG) {console.log(`${msg}\n${json ? JSON.stringify(json, null, 2) : ''}\n`)}};

describe('Model', function() {
  this.timeout(TEST_TIMEOUT);
  
  // Records
  let u1, u2, u3; // user
  let c1, c2, c3, c4, c5; // contact
  let o1, o2, o3, o4; // org
  let p1, p2, p3; // operation
  let pp1, pp2; // operation
  let t1, t2, t3, t4, t5, t6, t7; // transaction
  let tt1, tt2, tt3, tt4, tt5, tt6, tt7; // transaction
  
  let cursor;
  
  before(() => resetDatabase()
    .then(() => createUser({username: 'u1'}).then(u => u1 = u))
    .then(() => createUser({username: 'u2'}).then(u => u2 = u))
    .then(() => createUser({username: 'u3'}).then(u => u3 = u))
    .then(() => createContact({}).then(u => c1 = u))
    .then(() => createContact({}).then(u => c2 = u))
    .then(() => createContact({}).then(u => c3 = u))
    .then(() => createContact({}).then(u => c4 = u))
    .then(() => createContact({}).then(u => c5 = u))
    .then(() => createOrganization({}).then(u => o1 = u))
    .then(() => createOrganization({}).then(u => o2 = u))
    .then(() => createOrganization({}).then(u => o3 = u))
    .then(() => createOrganization({}).then(u => o4 = u))
    .then(() => createOperation({}).then(u => p1 = u))
    .then(() => createOperation({}).then(u => p2 = u))
    .then(() => createOperation({}).then(u => p3 = u))
    .then(() => createOperation({}).then(u => pp1 = u))
    .then(() => createOperation({}).then(u => pp2 = u))
    .then(() => createTransaction({}).then(u => t1 = u))
    .then(() => createTransaction({}).then(u => t2 = u))
    .then(() => createTransaction({}).then(u => t3 = u))
    .then(() => createTransaction({}).then(u => t4 = u))
    .then(() => createTransaction({}).then(u => t5 = u))
    .then(() => createTransaction({}).then(u => t6 = u))
    .then(() => createTransaction({}).then(u => t7 = u))
    .then(() => createTransaction({}).then(u => tt1 = u))
    .then(() => createTransaction({}).then(u => tt2 = u))
    .then(() => createTransaction({}).then(u => tt3 = u))
    .then(() => createTransaction({}).then(u => tt4 = u))
    .then(() => createTransaction({}).then(u => tt5 = u))
    .then(() => createTransaction({}).then(u => tt6 = u))
    .then(() => createTransaction({}).then(u => tt7 = u))
  );
  
  describe('constructor()', function() {
    // let User = new PyropeModel(UserType, {tablePrefix, tableSuffix});
    
    it('initializes model with correct tableName', () => new Promise((resolve, reject) => {
      resolve(Promise.all([
        expect(User.name).to.equal(User.name),
        expect(User.humanName).to.equal('User'),
        expect(User.fullTableName).to.equal('qtz-users-test'),
        expect(User.fields).to.be.an('object')
      ]));
    }));
  });
  
  describe('get({uuid: u1.uuid})', function() {
    // let User = new PyropeModel(UserType, {tablePrefix, tableSuffix});
    
    it('retrieves the proper fields', () => new Promise((resolve, reject) => {
      User.get({uuid: u1.uuid}).then(res => {
        resolve(Promise.all([
          expect(res).to.be.an('object'),
          expect(res).to.have.property('uuid', u1.uuid),
        ]));
      }).catch(err => reject(err));
    }));
    
    it('returns false when the record doesn\'t exist', () => new Promise((resolve, reject) => {
      User.get({username: 'user111'})
        .then(res => resolve(
          expect(res).to.equal(false)
        ))
        .catch(err => reject(err));
    }));
  
    it('throws when the index doesn\'t exist', () => new Promise((resolve, reject) => {
      User.get({username111: ''})
        .then(res => reject(`Expected rejection`))
        .catch(err => resolve());
    }));
  });
  
  describe('getAll()', function() {
    describe('getAll({})', function () {
      // let User = new PyropeModel(UserType, {tablePrefix, tableSuffix});
    
      it('retrieves all users with proper fields', () => new Promise((resolve, reject) => {
        User.getAll().then(res => {
          resolve(Promise.all([
            expect(res).to.be.an('array'),
            expect(res).to.have.lengthOf(3),
            expect(res[0]).to.have.property('uuid', u1.uuid),
            expect(res[1]).to.have.property('uuid', u2.uuid),
            expect(res[2]).to.have.property('uuid', u3.uuid),
          ]));
        }).catch(err => reject(err));
      }));
    });
  
    describe('getAll({order: \'desc\'})', function () {
      // let User = new PyropeModel(UserType, {tablePrefix, tableSuffix});
    
      it('retrieves all users in desc. order with proper fields', () => new Promise((resolve, reject) => {
        User.getAll({order: 'desc'}).then(res => {
          resolve(Promise.all([
            expect(res).to.be.an('array'),
            expect(res).to.have.lengthOf(3),
            expect(res[0]).to.have.property('uuid', u3.uuid),
            expect(res[1]).to.have.property('uuid', u2.uuid),
            expect(res[2]).to.have.property('uuid', u1.uuid),
          ]));
        }).catch(err => reject(err));
      }));
    });
  
    describe('getAll({limit: 1})', function () {
      // let User = new PyropeModel(UserType, {tablePrefix, tableSuffix});
    
      it('retrieves 1 user and saves cursor', () => new Promise((resolve, reject) => {
        User.getAll({limit: 1}).then(res => {
          cursor = res[0].cursor;
        
          resolve(Promise.all([
            expect(res).to.be.an('array'),
            expect(res).to.have.lengthOf(1),
            expect(res[0]).to.have.property('uuid', u1.uuid),
            expect(res[0]).to.have.property('cursor'),
          ]));
        }).catch(err => reject(err));
      }));
    });
  
    describe('getAll({cursor})', function () {
      // let User = new PyropeModel(UserType, {tablePrefix, tableSuffix});
    
      it('retrieves next 2 users using the cursor', () => new Promise((resolve, reject) => {
        User.getAll({cursor}).then(res => {
          resolve(Promise.all([
            expect(res).to.be.an('array'),
            expect(res).to.have.lengthOf(2),
            expect(res[0]).to.have.property('uuid', u2.uuid),
            expect(res[1]).to.have.property('uuid', u3.uuid),
          ]));
        }).catch(err => reject(err));
      }));
    });
  });
  
  describe('create()', function() {
    describe('create({username: \'user1\'})', function() {
      // let User = new PyropeModel(UserType, {tablePrefix, tableSuffix});
      
      it('creates user with proper fields', () => new Promise((resolve, reject) => {
        User.create({username: 'user1'}).then(res => {
          resolve(Promise.all([
            expect(res).to.have.property('username', 'user1')
          ]));
        }).catch(err => reject(err));
      }));
      
      xit('throws when the index doesn\'t exist', () => new Promise((resolve, reject) => {
        User.create({username111: 'user1'})
          .then(res => reject(`Expected rejection`))
          .catch(err => resolve());
      }));
      
      it('checks table count === 4', () => new Promise((resolve, reject) => {
        User.count()
          .then(res => resolve(Promise.all([
            expect(res).to.equal(4)
          ])))
          .catch(err => reject(err));
      }));
    });
  
    describe('create({username: \'user2\', password: \'password\'}, {beforeValidation, afterValidation, beforeCreate, afterCreate})', function() {
      // let User = new PyropeModel(UserType, {validations: userValidations, tablePrefix, tableSuffix});
    
      const beforeValidation = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, beforeValidation: true});
      });
    
      const afterValidation = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, afterValidation: true});
      });
    
      const beforeCreate = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, beforeCreate: true});
      });
    
      const afterCreate = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, afterCreate: true});
      });
    
      it('creates user with proper fields and executes hooks', () => new Promise((resolve, reject) => {
        User.create({username: 'user2', password: 'password'}, {beforeValidation, afterValidation, beforeCreate, afterCreate}).then(res => {
          resolve(Promise.all([
            expect(res).to.have.property('username', 'user2'),
            expect(res).to.have.property('validationsField', true),
            expect(res).to.have.property('beforeValidation', true),
            expect(res).to.have.property('afterValidation', true),
            expect(res).to.have.property('beforeCreate', true),
            expect(res).to.have.property('afterCreate', true),
          ]));
        }).catch(err => reject(err));
      }));
  
      it('checks table count === 5', () => new Promise((resolve, reject) => {
        User.count()
          .then(res => resolve(Promise.all([
            expect(res).to.equal(5)
          ])))
          .catch(err => reject(err));
      }));
    });
  });
  
  describe('update()', function() {
    describe('update(index, fields)', function() {
      // let User = new PyropeModel(UserType, {tablePrefix, tableSuffix});
      
      it('updates record and return proper object mapping', () => new Promise((resolve, reject) => {
        User.update({username: 'user1'}, {username: 'user1_updated'}).then(res => {
          resolve(Promise.all([
            expect(res).to.have.property('username', 'user1_updated')
          ]));
        }).catch(err => reject(err));
      }));
  
      it('throws when the index doesn\'t exist', () => new Promise((resolve, reject) => {
        User.update({username2: 'user1111'}, {username: 'user1_updated'})
          .then(res => reject(`Expected rejection`))
          .catch(err => resolve());
      }));
      
      it('throws when the record doesn\'t exist', () => new Promise((resolve, reject) => {
        User.update({username: 'user1111'}, {username: 'user1_updated'})
          .then(res => resolve(
            expect(res).to.equal(false)
          ))
          .catch(err => resolve());
      }));
    });
    
    describe('update(index, fields, {...hooks})', function() {
      // let User = new PyropeModel(UserType, {validations: userValidations, tablePrefix, tableSuffix});
      
      const beforeValidation = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, beforeValidation: true});
      });
  
      const afterValidation = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, afterValidation: true});
      });
  
      const beforeUpdate = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, beforeUpdate: true});
      });
  
      const afterUpdate = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, afterUpdate: true});
      });
  
      it('updates record and return proper object mapping', () => new Promise((resolve, reject) => {
        User.update(
          {username: 'user1_updated'},
          {username: 'user1'},
          {beforeValidation, afterValidation, beforeUpdate, afterUpdate}
        ).then(res => {
          resolve(Promise.all([
            expect(res).to.have.property('username', 'user1'),
            expect(res).to.have.property('validationsField', true),
            expect(res).to.have.property('beforeValidation', true),
            expect(res).to.have.property('afterValidation', true),
            expect(res).to.have.property('beforeUpdate', true),
            expect(res).to.have.property('afterUpdate', true),
          ]));
        }).catch(err => reject(err));
      }));
    });
  
    describe('setChild: u1.contact = c1 via update()', function() {
      let User = new PyropeModel(UserType, {tablePrefix, tableSuffix});
      
      it('makes update', () => new Promise((resolve, reject) => {
        User.update({uuid: u1.uuid}, {setContact: c1.uuid})
          .then(res => {
            resolve(Promise.all([
              expect(res).to.have.property('uuid', u1.uuid)
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - u1.contact == c1', () => new Promise((resolve, reject) => {
        ContactsUsers.getAssociations({
          items: [
            {index: {user: u1.uuid}},
            {index: 'contact'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(1),
              expect(res[0]).to.equal(c1.uuid)
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - c1.user == u1', () => new Promise((resolve, reject) => {
        ContactsUsers.getAssociations({
          items: [
            {index: {contact: c1.uuid}},
            {index: 'user'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(1),
              expect(res[0]).to.equal(u1.uuid)
            ]))
          })
          .catch(err => reject(err));
      }));
    });
  
    describe('unsetChild: u1.contact = null via update())', function() {
      // let User = new PyropeModel(UserType, {tablePrefix, tableSuffix});
  
      it('makes update', () => new Promise((resolve, reject) => {
        User.update({uuid: u1.uuid}, {unsetContact: null})
          .then(res => {
            resolve(Promise.all([
              expect(res).to.have.property('uuid', u1.uuid)
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - u1.contact == null', () => new Promise((resolve, reject) => {
        ContactsUsers.getAssociations({
          items: [
            {index: {user: u1.uuid}},
            {index: 'contact'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(0),
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - c1.user == null', () => new Promise((resolve, reject) => {
        ContactsUsers.getAssociations({
          items: [
            {index: {contact: c1.uuid}},
            {index: 'user'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(0),
            ]))
          })
          .catch(err => reject(err));
      }));
    });
  
    describe('setChildren: o1.contacts = [c1, c2] via update())', function() {
      // let Organization = new PyropeModel(OrganizationType, {tablePrefix, tableSuffix});
      
      it('makes update', () => new Promise((resolve, reject) => {
        Organization.update({uuid: o1.uuid}, {setContacts: [c1.uuid, c2.uuid, c3.uuid, c4.uuid, c5.uuid]})
          .then(res => {
            resolve(Promise.all([
              expect(res).to.have.property('uuid', o1.uuid)
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - o1.contacts == [c1, c2, c3, c4, c5]', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {organization: o1.uuid}},
            {index: 'contact'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(5),
              expect(res[0]).to.equal(c1.uuid),
              expect(res[1]).to.equal(c2.uuid),
              expect(res[2]).to.equal(c3.uuid),
              expect(res[3]).to.equal(c4.uuid),
              expect(res[4]).to.equal(c5.uuid),
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - c1.organization == o1', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {contact: c1.uuid}},
            {index: 'organization'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(1),
              expect(res[0]).to.equal(o1.uuid),
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - c2.organization == o1', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {contact: c2.uuid}},
            {index: 'organization'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(1),
              expect(res[0]).to.equal(o1.uuid),
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - c3.organization == o1', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {contact: c3.uuid}},
            {index: 'organization'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(1),
              expect(res[0]).to.equal(o1.uuid),
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - c4.organization == o1', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {contact: c4.uuid}},
            {index: 'organization'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(1),
              expect(res[0]).to.equal(o1.uuid),
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - c5.organization == o1', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {contact: c5.uuid}},
            {index: 'organization'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(1),
              expect(res[0]).to.equal(o1.uuid),
            ]))
          })
          .catch(err => reject(err));
      }));
    });
  
    describe('unsetChildren(o1, c1) via update())', function() {
      it('makes update', () => new Promise((resolve, reject) => {
        Organization.update({uuid: o1.uuid}, {unsetContacts: c1.uuid})
          .then(res => {
            resolve(Promise.all([
              expect(res).to.have.property('uuid', o1.uuid)
            ]))
          })
          .catch(err => reject(err));
      }));

      it('checks - o1.contacts == [c2, c3, c4, c5]', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {organization: o1.uuid}},
            {index: 'contact'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(4),
              expect(res[0]).to.equal(c2.uuid),
              expect(res[1]).to.equal(c3.uuid),
              expect(res[2]).to.equal(c4.uuid),
              expect(res[3]).to.equal(c5.uuid),
            ]))
          })
          .catch(err => reject(err));
      }));

      it('checks - c1.organizations == []', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {contact: c1.uuid}},
            {index: 'organization'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(0),
            ]))
          })
          .catch(err => reject(err));
      }));
    });
  
    describe('unsetChildren(o1, [c2, c3]) via update())', function() {
      it('makes update', () => new Promise((resolve, reject) => {
        Organization.update({uuid: o1.uuid}, {unsetContacts: [c2.uuid, c3.uuid]})
          .then(res => {
            resolve(Promise.all([
              expect(res).to.have.property('uuid', o1.uuid)
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - o1.contacts == [c4, c5]', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {organization: o1.uuid}},
            {index: 'contact'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(2),
              expect(res[0]).to.equal(c4.uuid),
              expect(res[1]).to.equal(c5.uuid),
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - c2.organizations == []', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {contact: c2.uuid}},
            {index: 'organization'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(0),
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - c3.organization == []', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {contact: c3.uuid}},
            {index: 'organization'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(0),
            ]))
          })
          .catch(err => reject(err));
      }));
    });
  
    describe('(all) unsetChildren(o1, null) via update())', function() {
      it('makes update', () => new Promise((resolve, reject) => {
        Organization.update({uuid: o1.uuid}, {unsetContacts: null})
          .then(res => {
            resolve(Promise.all([
              expect(res).to.have.property('uuid', o1.uuid)
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - o1.contacts == []', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {organization: o1.uuid}},
            {index: 'contact'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(0),
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - c4.organization == []', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {contact: c4.uuid}},
            {index: 'organization'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(0),
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks - c5.organization == []', () => new Promise((resolve, reject) => {
        ContactsOrganizations.getAssociations({
          items: [
            {index: {contact: c5.uuid}},
            {index: 'organization'}
          ]
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(0),
            ]))
          })
          .catch(err => reject(err));
      }));
    });
  });
  
  describe('destroy()', function() {
    describe('destroy(u1)', function() {
      const beforeValidation = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, beforeValidation: true});
      });
  
      const afterValidation = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, afterValidation: true});
      });
  
      const beforeDestroy = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, beforeDestroy: true});
      });
  
      const afterDestroy = (fields, fieldName) => new Promise((resolve, reject) => {
        resolve({...fields, afterDestroy: true});
      });
      
      it('destroys the record with hooks', () => new Promise((resolve, reject) => {
        User.destroy({username: 'user1'}, {beforeValidation, afterValidation, beforeDestroy, afterDestroy})
          .then(res => {
            return resolve(Promise.all([
              expect(res).to.have.property('username', 'user1')
            ]));
          }).catch(err => reject(err));
      }));
  
      it('checks table count === 4', () => new Promise((resolve, reject) => {
        User.count()
          .then(res => resolve(Promise.all([
            expect(res).to.equal(4)
          ])))
          .catch(err => reject(err));
      }));
      
      it('throws when the record doesn\'t exist', () => new Promise((resolve, reject) => {
        User.destroy({username: 'user111'})
          .then(res => resolve(
            expect(res).to.equal(false)
          ))
          .catch(err => resolve());
      }));
    });
    
    describe('Destroy dependent', function() {
      it('setChildren(pp1, [tt1, tt2, tt3])', () => new Promise((resolve, reject) => {
        Operation.setChildren(pp1.uuid, {transactions: [tt1.uuid, tt2.uuid, tt3.uuid]})
        .then(res => {
          resolve(Promise.all([
            expect(res).to.equal(true)
          ]))
        })
        .catch(err => reject(err));
      }));
  
      it('setChildren(pp2, [tt4, tt5, tt6])', () => new Promise((resolve, reject) => {
        Operation.setChildren(pp2.uuid, {transactions: [tt4.uuid, tt5.uuid, tt6.uuid]})
          .then(res => {
            resolve(Promise.all([
              expect(res).to.equal(true)
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('destroy(pp1), destroys tt1, tt2, tt3', () => new Promise((resolve, reject) => {
        Operation.destroy({uuid: pp1.uuid})
          .then(res => {
            resolve(Promise.all([
              expect(res).to.have.property('uuid', pp1.uuid)
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks that tt1, tt2, tt3 have been destroyed', () => new Promise((resolve, reject) => {
        const promises = [
          Transaction.get({uuid: tt1.uuid}),
          Transaction.get({uuid: tt2.uuid}),
          Transaction.get({uuid: tt3.uuid}),
        ];
        
        Promise.all(promises)
          .then((res) => {
            if(filter(res, r => r === false).length !== 3) {
              reject(`Not all items were deleted.`)
            } else {
              resolve()
            }
          })
          .catch(err => reject(err));
      }));
      
      
    });
  
    describe('Destroy nullify', function() {
      // const Transaction = new PyropeModel(TransactionType, {tablePrefix, tableSuffix});
      // const Operation = new PyropeModel(OperationType, {tablePrefix, tableSuffix});
      
      it('destroy(tt4), nullifies pp2.tt4', () => new Promise((resolve, reject) => {
        Transaction.destroy({uuid: tt4.uuid})
          .then(res => {
            resolve(Promise.all([
              expect(res).to.have.property('uuid', tt4.uuid)
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks that pp2.transactions = [tt5, tt6]', () => new Promise((resolve, reject) => {
        Operation.getChildren(pp2.uuid, 'transaction', operationResolvers.getTransaction)
          .then(res => {
            resolve(Promise.all([
              expect(res).to.be.an('array').of.length(2),
              expect(res[0]).to.have.property('uuid', tt5.uuid),
              expect(res[1]).to.have.property('uuid', tt6.uuid),
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('destroy(pp2), destroys tt5, tt6', () => new Promise((resolve, reject) => {
        Operation.destroy({uuid: pp2.uuid})
          .then(res => {
            resolve(Promise.all([
              expect(res).to.have.property('uuid', pp2.uuid)
            ]))
          })
          .catch(err => reject(err));
      }));
  
      it('checks that tt5, tt6 have been destroyed', () => new Promise((resolve, reject) => {
        const promises = [
          Transaction.get({uuid: tt5.uuid}),
          Transaction.get({uuid: tt6.uuid}),
        ];
    
        Promise.all(promises)
          .then((res) => {
            if(filter(res, r => r === false).length !== 2) {
              reject(`Not all items were deleted.`)
            } else {
              resolve()
            }
          })
          .catch(err => reject(err));
      }));
    });
  });
  
  describe('Associations', function() {
    // let User = new PyropeModel(UserType, {tablePrefix, tableSuffix});
    // let Contact = new PyropeModel(ContactType, {tablePrefix, tableSuffix});
    // let Organization = new PyropeModel(OrganizationType, {tablePrefix, tableSuffix});
    // let Operation = new PyropeModel(OperationType, {tablePrefix, tableSuffix});
    // let Transaction = new PyropeModel(TransactionType, {tablePrefix, tableSuffix});
    
    describe('1:1', function() {
      describe('Association', function() {
        it('setChild(u1, c1)', () => new Promise((resolve, reject) => {
          User.setChild(u1.uuid, {contact: c1.uuid})
            .then(res => {
              resolve(Promise.all([
                expect(res).to.equal(true)
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check getChild(u1, contact) == c1', () => new Promise((resolve, reject) => {
          User.getChild(u1.uuid, 'contact', userResolvers.getContact)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.have.property('uuid', c1.uuid)
              ]));
            })
            .catch(err => reject(err));
        }));
  
        it('check getChild(c1, user) == u1', () => new Promise((resolve, reject) => {
          Contact.getChild(c1.uuid, 'user', contactResolvers.getUser)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.have.property('uuid', u1.uuid)
              ]));
            })
            .catch(err => reject(err));
        }));
  
        it('check assoc. table count == 1', () => new Promise((resolve, reject) => {
          ContactsUsers.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(1)
            ])))
            .catch(err => reject(err));
        }));
      });
    
      describe('Reassociation', function() {
        it('setChild(u1, c2)', () => new Promise((resolve, reject) => {
          User.setChild(u1.uuid, {contact: c2.uuid})
            .then(res => {
              resolve(Promise.all([
                expect(res).to.equal(true)
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check getChild(u1, contact) == c2', () => new Promise((resolve, reject) => {
          User.getChild(u1.uuid, 'contact', userResolvers.getContact)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.have.property('uuid', c2.uuid)
              ]));
            })
            .catch(err => reject(err));
        }));
  
        it('check getChild(c2, user) == u1', () => new Promise((resolve, reject) => {
          Contact.getChild(c2.uuid, 'user', contactResolvers.getUser)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.have.property('uuid', u1.uuid)
              ]));
            })
            .catch(err => reject(err));
        }));
        
        it('check getChild(c1, user) == null', () => new Promise((resolve, reject) => {
          Contact.getChild(c1.uuid, 'user', contactResolvers.getUser)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.equal(null)
              ]));
            })
            .catch(err => reject(err));
        }));
        
        it('check assoc. table count == 1', () => new Promise((resolve, reject) => {
          ContactsUsers.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(1)
            ])))
            .catch(err => reject(err));
        }));
      });
    
      describe('Dissociation', function() {
        it('unsetChild(c2, user)', () => new Promise((resolve, reject) => {
          Contact.unsetChild(c2.uuid, 'user')
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
      
        it('check getChild(u1, contact) == null', () => new Promise((resolve, reject) => {
          User.getChild(u1.uuid, 'contact', userResolvers.getContact)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.equal(null)
              ]));
            })
            .catch(err => reject(err));
        }));
  
        it('check getChild(c2, user) == null', () => new Promise((resolve, reject) => {
          Contact.getChild(c2.uuid, 'user', contactResolvers.getUser)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.equal(null)
              ]));
            })
            .catch(err => reject(err));
        }));
      
        it('checks that association table count === 0', () => new Promise((resolve, reject) => {
          ContactsUsers.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(0)
            ])))
            .catch(err => reject(err));
        }));
      });
    });
  
    describe('1:N', function() {
      describe('Associations', function() {
        it('scalar - setChildren(p1, t1)', () => new Promise((resolve, reject) => {
          Operation.setChildren(p1.uuid, {transactions: t1.uuid})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('checks getChildren(p1, transaction) == [t1]', () => new Promise((resolve, reject) => {
          Operation.getChildren(p1.uuid, 'transaction', operationResolvers.getTransaction)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', t1.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('array - setChildren(p1, [t2, t3])', () => new Promise((resolve, reject) => {
          Operation.setChildren(p1.uuid, {transactions: [t2.uuid, t3.uuid]})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('checks getChildren(p1, transaction) == [t1, t2, t3]', () => new Promise((resolve, reject) => {
          Operation.getChildren(p1.uuid, 'transaction', operationResolvers.getTransaction)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(3),
                expect(res[0]).to.have.property('uuid', t1.uuid),
                expect(res[1]).to.have.property('uuid', t2.uuid),
                expect(res[2]).to.have.property('uuid', t3.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('checks that association table count === 3', () => new Promise((resolve, reject) => {
          OperationsTransactions.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(3)
            ])))
            .catch(err => reject(err));
        }));
      });
  
      describe('Reassociations', function() {
        it('scalar - setChild(t1, p2)', () => new Promise((resolve, reject) => {
          Transaction.setChild(t1.uuid, {operation: p2.uuid})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
    
        it('checks getChildren(p1, transaction) == [t2, t3]', () => new Promise((resolve, reject) => {
          Operation.getChildren(p1.uuid, 'transaction', operationResolvers.getTransaction)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(2),
                expect(res[0]).to.have.property('uuid', t2.uuid),
                expect(res[1]).to.have.property('uuid', t3.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('checks getChild(t1, operation) == p2', () => new Promise((resolve, reject) => {
          Transaction.getChild(t1.uuid, 'operation', transactionResolvers.getOperation)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.have.property('uuid', p2.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('checks getChildren(p2, transaction) == [t1]', () => new Promise((resolve, reject) => {
          Operation.getChildren(p2.uuid, 'transaction', operationResolvers.getTransaction)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', t1.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
    
        it('*rejects: array - setChildren(t2, [p2, p3])', () => new Promise((resolve, reject) => {
          Transaction.setChildren(t2.uuid, {operation: [p2.uuid, p3.uuid]})
            .then(res => reject(`Expected rejection`))
            .catch(err => resolve());
        }));
    
        it('checks that association table count === 3', () => new Promise((resolve, reject) => {
          OperationsTransactions.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(3)
            ])))
            .catch(err => reject(err));
        }));
      });
      
      /*
       *  uuid  | operation | transaction
       *  0     | p1        | t2
       *  1     | p1        | t3
       *  2     |  p2       |  t1
       *  >3    | p1        | t4
       *  >4    | p1        | t5
       *  >5    | p1        | t6
       *  >6    |  p2       |  t7
       */
      
      describe('Dissociations', function() {
        it('p1 << [t4, t5, t6], p2 << t7', () => new Promise((resolve, reject) => {
          Operation.setChildren(p1.uuid, {transactions: [t4.uuid, t5.uuid, t6.uuid]})
            .then(() => Operation.setChildren(p2.uuid, {transaction: t7.uuid}))
            .then(() => resolve())
            .catch(err => reject(err));
        }));
  
        it('rejects if is not associated - unsetChildren(p1, t1)', () => new Promise((resolve, reject) => {
          Operation.unsetChildren(p1.uuid, {transaction: t1.uuid})
            .then((res) => reject(`Expected rejection, got: ${JSON.stringify(res, null, 2)}`))
            .catch((err) => resolve());
        }));
        
        it('array - unsetChildren(p1, t2)', () => new Promise((resolve, reject) => {
          Operation.unsetChildren(p1.uuid, {transaction: t2.uuid})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('checks getChildren(p1, transaction) == [t3, t4, t5, t6]', () => new Promise((resolve, reject) => {
          Operation.getChildren(p1.uuid, 'transaction', operationResolvers.getTransaction)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(4),
                expect(res[0]).to.have.property('uuid', t3.uuid),
                expect(res[1]).to.have.property('uuid', t4.uuid),
                expect(res[2]).to.have.property('uuid', t5.uuid),
                expect(res[3]).to.have.property('uuid', t6.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('array - unsetChildren(p1, [t3, t4])', () => new Promise((resolve, reject) => {
          Operation.unsetChildren(p1.uuid, {transactions: [t3.uuid, t4.uuid]})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('checks getChildren(p1, transaction) == [t5, t6]', () => new Promise((resolve, reject) => {
          Operation.getChildren(p1.uuid, 'transaction', operationResolvers.getTransaction)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(2),
                expect(res[0]).to.have.property('uuid', t5.uuid),
                expect(res[1]).to.have.property('uuid', t6.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('array - unsetChildren(p1, transaction)', () => new Promise((resolve, reject) => {
          Operation.unsetChildren(p1.uuid, {transactions: null})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('checks getChildren(p1, transaction) == []', () => new Promise((resolve, reject) => {
          Operation.getChildren(p1.uuid, 'transactions', operationResolvers.getTransaction)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array'),
                expect(res).to.have.lengthOf(0),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('scalar - unsetChild(t1, operation)', () => new Promise((resolve, reject) => {
          Transaction.unsetChild(t1.uuid, 'operation')
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('checks getChild(t1, operation) == null', () => new Promise((resolve, reject) => {
          Transaction.getChild(t1.uuid, 'operation', transactionResolvers.getOperation)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.equal(null),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('checks getChildren(p2, transaction) == [t7]', () => new Promise((resolve, reject) => {
          Operation.getChildren(p2.uuid, 'transaction', operationResolvers.getTransaction)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', t7.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('array - unsetChildren(p2, transaction)', () => new Promise((resolve, reject) => {
          Operation.unsetChildren(p2.uuid, {transactions: null})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
        
        it('checks that association table count === 0', () => new Promise((resolve, reject) => {
          OperationsTransactions.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(0)
            ])))
            .catch(err => reject(err));
        }));
      });
    });
    
    describe('N:N', function() {
      describe('Associations', function() {
        it('scalar - setChildren(o1, c1)', () => new Promise((resolve, reject) => {
          Organization.setChildren(o1.uuid, {contact: c1.uuid})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('check getChildren(o1) == c1', () => new Promise((resolve, reject) => {
          Organization.getChildren(o1.uuid, 'contacts', organizationResolvers.getContacts)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', c1.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check getChildren(c1) == o1', () => new Promise((resolve, reject) => {
          Contact.getChildren(c1.uuid, 'organizations', contactResolvers.getOrganizations)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', o1.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check count == 1', () => new Promise((resolve, reject) => {
          ContactsOrganizations.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(1)
            ])))
            .catch(err => reject(err));
        }));
  
        it('array - setChildren(o1, [c2,c3])', () => new Promise((resolve, reject) => {
          Organization.setChildren(o1.uuid, {contacts: [c2.uuid, c3.uuid]})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('check - getChildren(o1) == [c1, c2, c3]', () => new Promise((resolve, reject) => {
          Organization.getChildren(o1.uuid, 'contacts', organizationResolvers.getContacts)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(3),
                expect(res[0]).to.have.property('uuid', c1.uuid),
                expect(res[1]).to.have.property('uuid', c2.uuid),
                expect(res[2]).to.have.property('uuid', c3.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check - getChildren(c2) == o1', () => new Promise((resolve, reject) => {
          Contact.getChildren(c2.uuid, 'organizations', contactResolvers.getOrganizations)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', o1.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check - getChildren(c3) == o1', () => new Promise((resolve, reject) => {
          Contact.getChildren(c3.uuid, 'organizations', contactResolvers.getOrganizations)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', o1.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check count == 3', () => new Promise((resolve, reject) => {
          ContactsOrganizations.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(3)
            ])))
            .catch(err => reject(err));
        }));
  
        it('scalar - setChildren(c1, o2)', () => new Promise((resolve, reject) => {
          Contact.setChildren(c1.uuid, {organization: o2.uuid})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('check getChildren(c1) == [o1, o2]', () => new Promise((resolve, reject) => {
          Contact.getChildren(c1.uuid, 'organizations', contactResolvers.getOrganizations)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(2),
                expect(res[0]).to.have.property('uuid', o1.uuid),
                expect(res[1]).to.have.property('uuid', o2.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check count == 4', () => new Promise((resolve, reject) => {
          ContactsOrganizations.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(4)
            ])))
            .catch(err => reject(err));
        }));
  
        it('array - setChildren(c1, [o3, o4])', () => new Promise((resolve, reject) => {
          Contact.setChildren(c1.uuid, {organizations: [o3.uuid, o4.uuid]})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('check getChildren(c1) == [o1, o2, o3, o4]', () => new Promise((resolve, reject) => {
          Contact.getChildren(c1.uuid, 'organizations', contactResolvers.getOrganizations)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(4),
                expect(res[0]).to.have.property('uuid', o1.uuid),
                expect(res[1]).to.have.property('uuid', o2.uuid),
                expect(res[2]).to.have.property('uuid', o3.uuid),
                expect(res[3]).to.have.property('uuid', o4.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check count == 6', () => new Promise((resolve, reject) => {
          ContactsOrganizations.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(6)
            ])))
            .catch(err => reject(err));
        }));
      });
  
      describe('Dissociations', function() {
        it('scalar - unsetChildren(o1, c1)', () => new Promise((resolve, reject) => {
          Organization.unsetChildren(o1.uuid, {contact: c1.uuid})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('check - getChildren(o1) == [c2, c3]', () => new Promise((resolve, reject) => {
          Organization.getChildren(o1.uuid, 'contacts', organizationResolvers.getContacts)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(2),
                expect(res[0]).to.have.property('uuid', c2.uuid),
                expect(res[1]).to.have.property('uuid', c3.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check - getChildren(c2) == o1', () => new Promise((resolve, reject) => {
          Contact.getChildren(c2.uuid, 'organizations', contactResolvers.getOrganizations)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', o1.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check - getChildren(c3) == o1', () => new Promise((resolve, reject) => {
          Contact.getChildren(c3.uuid, 'organizations', contactResolvers.getOrganizations)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', o1.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check - count == 5', () => new Promise((resolve, reject) => {
          ContactsOrganizations.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(5)
            ])))
            .catch(err => reject(err));
        }));
  
        it('all - unsetChildren(o1, contacts)', () => new Promise((resolve, reject) => {
          Organization.unsetChildren(o1.uuid, {contacts: null})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('check - getChildren(c1) == [o2, o3, o4]', () => new Promise((resolve, reject) => {
          Contact.getChildren(c1.uuid, 'organizations', contactResolvers.getOrganizations)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(3),
                expect(res[0]).to.have.property('uuid', o2.uuid),
                expect(res[1]).to.have.property('uuid', o3.uuid),
                expect(res[2]).to.have.property('uuid', o4.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check - getChildren(o2) == c1', () => new Promise((resolve, reject) => {
          Organization.getChildren(o2.uuid, 'contacts', organizationResolvers.getContacts)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', c1.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check - getChildren(o3) == c1', () => new Promise((resolve, reject) => {
          Organization.getChildren(o3.uuid, 'contacts', organizationResolvers.getContacts)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', c1.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check - getChildren(o4) == c1', () => new Promise((resolve, reject) => {
          Organization.getChildren(o4.uuid, 'contacts', organizationResolvers.getContacts)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', c1.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check - count == 3', () => new Promise((resolve, reject) => {
          ContactsOrganizations.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(3)
            ])))
            .catch(err => reject(err));
        }));
  
        it('array - unsetChildren(c1, [o2, o4])', () => new Promise((resolve, reject) => {
          Contact.unsetChildren(c1.uuid, {organizations: [o2.uuid, o4.uuid]})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
  
        it('check - getChildren(c1) == o3', () => new Promise((resolve, reject) => {
          Contact.getChildren(c1.uuid, 'organizations', contactResolvers.getOrganizations)
            .then(res => {
              resolve(Promise.all([
                expect(res).to.be.an('array').of.length(1),
                expect(res[0]).to.have.property('uuid', o3.uuid),
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check - count == 1', () => new Promise((resolve, reject) => {
          ContactsOrganizations.count()
            .then(res => resolve(Promise.all([
              expect(res).to.equal(1)
            ])))
            .catch(err => reject(err));
        }));
      });
    });
  });
});