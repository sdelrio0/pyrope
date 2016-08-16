import { expect } from 'chai';
import * as pyrope from '../../../lib';
import PyropeModel from '../../../lib';
import { resetDatabase, createUser, createContact, createOrganization, createTransaction, createOperation } from '../../test_helper';
import Promise from 'bluebird';
const bcrypt = Promise.promisifyAll(require('bcryptjs'));

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
import { TEST_TIMEOUT } from '../../test_helper';

const DEBUG = true;

const log = (msg, json) => {if(DEBUG) {console.log(`${msg}\n${json ? JSON.stringify(json, null, 2) : ''}\n`)}};

describe.only('Model', function() {
  this.timeout(TEST_TIMEOUT);
  
  // Records
  let u1, u2, u3; // user
  let c1, c2, c3; // contact
  let o1, o2, o3; // org
  let p1, p2, p3; // operation
  let t1, t2, t3; // transaction
  
  let cursor;
  
  before(() => resetDatabase()
    .then(() => createUser({username: 'u1'}).then(u => u1 = u))
    .then(() => createUser({username: 'u2'}).then(u => u2 = u))
    .then(() => createUser({username: 'u3'}).then(u => u3 = u))
    .then(() => createContact({}).then(u => c1 = u))
    .then(() => createContact({}).then(u => c2 = u))
    .then(() => createContact({}).then(u => c3 = u))
    .then(() => createOrganization({}).then(u => o1 = u))
    .then(() => createOrganization({}).then(u => o2 = u))
    .then(() => createOrganization({}).then(u => o3 = u))
    .then(() => createOperation({}).then(u => p1 = u))
    .then(() => createOperation({}).then(u => p2 = u))
    .then(() => createOperation({}).then(u => p3 = u))
    .then(() => createTransaction({}).then(u => t1 = u))
    .then(() => createTransaction({}).then(u => t2 = u))
    .then(() => createTransaction({}).then(u => t3 = u))
  );
  
  describe('constructor()', function() {
    let User = new PyropeModel(UserType);
    
    it('initializes model with correct fields', () => new Promise((resolve, reject) => {
      resolve(Promise.all([
        expect(User.name).to.equal(User.name),
        expect(User.humanName).to.equal('User'),
        expect(User.table).to.equal('users'),
        expect(User.fields).to.be.an('object')
      ]));
    }));
  });
  
  describe('get({uuid: u1.uuid})', function() {
    let User = new PyropeModel(UserType, {table: '_test_users', defaultQueryKey: 'username'});
    
    it('retrieves the proper fields', () => new Promise((resolve, reject) => {
      User.get({uuid: u1.uuid}).then(res => {
        resolve(Promise.all([
          expect(res).to.be.an('object'),
          expect(res).to.have.property('uuid', u1.uuid),
        ]));
      }).catch(err => reject(err));
    }));
    
    it('throws when the record doesn\'t exist', () => new Promise((resolve, reject) => {
      User.get({username: 'user111'})
        .then(res => reject(`Expected rejection`))
        .catch(err => resolve());
    }));
  
    it('throws when the index doesn\'t exist', () => new Promise((resolve, reject) => {
      User.get({username111: ''})
        .then(res => reject(`Expected rejection`))
        .catch(err => resolve());
    }));
  });
  
  describe('getAll()', function() {
    describe('getAll({})', function () {
      let User = new PyropeModel(UserType, {table: '_test_users', defaultQueryKey: 'username'});
    
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
      let User = new PyropeModel(UserType, {table: '_test_users', defaultQueryKey: 'username'});
    
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
      let User = new PyropeModel(UserType, {table: '_test_users', defaultQueryKey: 'username'});
    
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
      let User = new PyropeModel(UserType, {table: '_test_users', defaultQueryKey: 'username'});
    
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
      let User = new PyropeModel(UserType, {table: '_test_users', defaultQueryKey: 'username'});
      
      it('creates user with proper fields', () => new Promise((resolve, reject) => {
        User.create({username: 'user1'}).then(res => {
          resolve(Promise.all([
            expect(res).to.have.property('username', 'user1')
          ]));
        }).catch(err => reject(err));
      }));
      
      it('throws when the index doesn\'t exist', () => new Promise((resolve, reject) => {
        User.create({username111: 'user1'})
          .then(res => reject(`Expected rejection`))
          .catch(err => resolve());
      }));
      
      it('checks table count === 4', () => new Promise((resolve, reject) => {
        pyrope.count({tableName: '_test_users'})
          .then(res => resolve(Promise.all([
            expect(res).to.equal(4)
          ])))
          .catch(err => reject(err));
      }));
    });
  
    describe('create({username: \'user2\', password: \'password\'}, {beforeValidation, afterValidation, beforeCreate, afterCreate})', function() {
      let User = new PyropeModel(UserType, {table: '_test_users', defaultQueryKey: 'username', validations: userValidations});
    
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
        pyrope.count({tableName: '_test_users'})
          .then(res => resolve(Promise.all([
            expect(res).to.equal(5)
          ])))
          .catch(err => reject(err));
      }));
    });
  });
  
  describe('update()', function() {
    describe('update(index, fields)', function() {
      let User = new PyropeModel(UserType, {table: '_test_users', defaultQueryKey: 'username', validations: userValidations});
      
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
          .then(res => reject(`Expected rejection`))
          .catch(err => resolve());
      }));
    });
    
    describe('update(index, fields, {...hooks})', function() {
      let User = new PyropeModel(UserType, {table: '_test_users', defaultQueryKey: 'username', validations: userValidations});
      
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
  
    xdescribe('setChild: u1.contact = c1 via update()', function() {
      
    });
  
    xdescribe('unsetChild: u1.contact = null via update())', function() {
    
    });
  
    xdescribe('setChildren: o1.contacts = [c1, c2] via update())', function() {
    
    });
  
    xdescribe('unsetChildren: o1.contacts = [c1, c2] via update())', function() {
    
    });
  });
  
  describe('destroy()', function() {
    describe('destroy(u1)', function() {
      let User = new PyropeModel(UserType, {table: '_test_users', defaultQueryKey: 'username'});
  
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
        pyrope.count({tableName: '_test_users'})
          .then(res => resolve(Promise.all([
            expect(res).to.equal(4)
          ])))
          .catch(err => reject(err));
      }));
      
      it('throws when the record doesn\'t exist', () => new Promise((resolve, reject) => {
        User.destroy({username: 'user111'})
          .then(res => reject(`Expected rejection`))
          .catch(err => resolve());
      }));
    });
  });
  
  describe('Associations', function() {
    let User = new PyropeModel(UserType, {table: '_test_users', defaultQueryKey: 'username'});
    let Contact = new PyropeModel(ContactType, {table: '_test_contacts', defaultQueryKey: 'username'});
    let Organization = new PyropeModel(OrganizationType, {table: '_test_organizations', defaultQueryKey: 'username'});
    let Operation = new PyropeModel(OperationType, {table: '_test_operations', defaultQueryKey: 'username'});
    let Transaction = new PyropeModel(TransactionType, {table: '_test_transactions', defaultQueryKey: 'username'});
    
    describe('1:1', function() {
      describe('Association', function() {
        it('setChild(u1, c1)', () => new Promise((resolve, reject) => {
          User.setChild(u1.uuid, {contact: c1.uuid}, {table: '_test_contacts_users'})
            .then(res => {
              resolve(Promise.all([
                expect(res).to.equal(true)
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check getChild(u1, contact) == c1', () => new Promise((resolve, reject) => {
          User.getChild(u1.uuid, 'contact', userResolvers.getContact, {table: '_test_contacts_users'})
            .then(res => {
              resolve(Promise.all([
                expect(res).to.have.property('uuid', c1.uuid)
              ]));
            })
            .catch(err => reject(err));
        }));
  
        it('check getChild(c1, user) == u1', () => new Promise((resolve, reject) => {
          Contact.getChild(c1.uuid, 'user', contactResolvers.getUser, {table: '_test_contacts_users'})
            .then(res => {
              resolve(Promise.all([
                expect(res).to.have.property('uuid', u1.uuid)
              ]));
            })
            .catch(err => reject(err));
        }));
  
        it('check assoc. table count == 1', () => new Promise((resolve, reject) => {
          pyrope.count({tableName: '_test_contacts_users'})
            .then(res => resolve(Promise.all([
              expect(res).to.equal(1)
            ])))
            .catch(err => reject(err));
        }));
      });
    
      describe('Reassociation', function() {
        it('setChild(u1, c2)', () => new Promise((resolve, reject) => {
          User.setChild(u1.uuid, {contact: c2.uuid}, {table: '_test_contacts_users'})
            .then(res => {
              resolve(Promise.all([
                expect(res).to.equal(true)
              ]))
            })
            .catch(err => reject(err));
        }));
  
        it('check getChild(u1, contact) == c2', () => new Promise((resolve, reject) => {
          User.getChild(u1.uuid, 'contact', userResolvers.getContact, {table: '_test_contacts_users'})
            .then(res => {
              resolve(Promise.all([
                expect(res).to.have.property('uuid', c2.uuid)
              ]));
            })
            .catch(err => reject(err));
        }));
  
        it('check getChild(c2, user) == u1', () => new Promise((resolve, reject) => {
          Contact.getChild(c2.uuid, 'user', contactResolvers.getUser, {table: '_test_contacts_users'})
            .then(res => {
              resolve(Promise.all([
                expect(res).to.have.property('uuid', u1.uuid)
              ]));
            })
            .catch(err => reject(err));
        }));
        
        it('check getChild(c1, user) == null', () => new Promise((resolve, reject) => {
          Contact.getChild(c1.uuid, 'user', contactResolvers.getUser, {table: '_test_contacts_users'})
            .then(res => {
              resolve(Promise.all([
                expect(res).to.equal(null)
              ]));
            })
            .catch(err => reject(err));
        }));
        
        it('check assoc. table count == 1', () => new Promise((resolve, reject) => {
          pyrope.count({tableName: '_test_contacts_users'})
            .then(res => resolve(Promise.all([
              expect(res).to.equal(1)
            ])))
            .catch(err => reject(err));
        }));
      });
    
      describe('Dissociation', function() {
        it('unsetChild(c2, user)', () => new Promise((resolve, reject) => {
          Contact.unsetChild(c2.uuid, 'user', {table: '_test_contacts_users'})
            .then(res => {
              resolve(expect(res).to.equal(true))
            })
            .catch(err => reject(err));
        }));
      
        it('check getChild(u1, contact) == null', () => new Promise((resolve, reject) => {
          User.getChild(u1.uuid, 'contact', userResolvers.getContact, {table: '_test_contacts_users'})
            .then(res => {
              resolve(Promise.all([
                expect(res).to.equal(null)
              ]));
            })
            .catch(err => reject(err));
        }));
  
        it('check getChild(c2, user) == null', () => new Promise((resolve, reject) => {
          Contact.getChild(c2.uuid, 'user', contactResolvers.getUser, {table: '_test_contacts_users'})
            .then(res => {
              resolve(Promise.all([
                expect(res).to.equal(null)
              ]));
            })
            .catch(err => reject(err));
        }));
      
        it('checks that association table count === 0', () => new Promise((resolve, reject) => {
          pyrope.count({tableName: '_test_contacts_users'})
            .then(res => resolve(Promise.all([
              expect(res).to.equal(0)
            ])))
            .catch(err => reject(err));
        }));
      });
    });
  
    describe('1:N', function() {
      xdescribe('setChildren(p1, t1)', function() {
    
      });
  
      xdescribe('getChildren(p1, \'transaction\')', function() {
    
      });
  
      xdescribe('setChildren(p1, [t2, t3]', function() {
    
      });
  
      xdescribe('getChildren(p1, \'transaction\')', function() {
    
      });
  
      xdescribe('setChildren(p2, t1)', function() {
    
      });
  
      xdescribe('getChildren(p1, \'transaction\')', function() {
    
      });
  
      xdescribe('getChildren(p2, \'transaction\')', function() {
    
      });
  
      xdescribe('getChildren(p1, \'transaction\')', function() {
    
      });
  
      xdescribe('getChildren(p2, \'transaction\')', function() {
    
      });
  
      xdescribe('setChildren(p2, [t2, t3])', function() {
    
      });
    });
  
    xdescribe('1:N', function() {
      xdescribe('setChildren(o1, c1)', function() {
    
      });
  
      xdescribe('getChildren(o1, \'contact\')', function() {
    
      });
  
      xdescribe('setChildren(o1, [c2, c3])', function() {
    
      });
  
      xdescribe('getChildren(o1, \'contact\')', function() {
    
      });
  
      xdescribe('', function() {
    
      });
    });
  });
});