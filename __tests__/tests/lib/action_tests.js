import Promise from 'bluebird';
import { expect } from 'chai';
import * as pyrope from '../../../lib';
import { sortBy } from 'underscore';
import { v4 } from 'uuid';
import { resetDatabase, createUser, createUserRecursive } from '../../test_helper';

const TEST_TIMEOUT = 4000;

describe('DynamoDB actions', function() {
  describe('create()', function() {
    this.timeout(TEST_TIMEOUT);
    beforeEach(() => resetDatabase());
     
    it('creates a new user and returns the correct attributes', function() {
      return new Promise((resolve, reject) => {
        pyrope.create({
          tableName: '_test_users',
          attributes: {
            username: 'john',
            password: 'password'
          }
        })
          .then((user) => {
            pyrope.ddbClient('scan', {TableName: '_test_users',})
              .then(res => {
                let list = sortBy(res.Items, 'createdAt');
                
                resolve(Promise.all([
                  expect(list).to.have.length.of(1),
                  expect(list[0]).to.have.property('username', 'john'),
                  expect(list[0]).to.have.property('password', 'password'),
                  expect(list[0]).to.have.property('uuid'),
                  expect(user.username).to.equal('john'),
                  expect(user.password).to.equal('password'),
                ]));
              })
          .catch(err => reject(err));
          })
        .catch(err => reject(err));
      });
    });
  });
  
  describe('all()', function() {
    this.timeout(TEST_TIMEOUT);
    beforeEach(() => resetDatabase());
    
    it('returns an array of all users', function() {
      return new Promise((resolve, reject) => {
        createUserRecursive({username: 'user', password: 'password'}, 2)
          .then(() => {
            pyrope.all({tableName: '_test_users'})
              .then(res => {
                let list = sortBy(res.Items, 'createdAt');
        
                resolve(Promise.all([
                  expect(list).to.have.lengthOf(2),
                  expect(list[0]).to.have.property('username', 'user2'),
                  expect(list[0]).to.have.property('password', 'password'),
                  expect(list[0]).to.have.property('uuid'),
                  expect(list[1]).to.have.property('username', 'user1'),
                  expect(list[1]).to.have.property('password', 'password'),
                  expect(list[1]).to.have.property('uuid'),
                ]));
              })
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      });
    });
    
    it('returns an array in ASC order', function() {
      return new Promise((resolve, reject) => {
        createUserRecursive({username: 'user', password: 'password'}, 3)
          .then(() => {
            pyrope.all({tableName: '_test_users'})
              .then(res => {
                let users = res.Items;
                
                resolve(Promise.all([
                  expect(users[0].createdAt).to.be.lessThan(users[1].createdAt),
                  expect(users[1].createdAt).to.be.lessThan(users[2].createdAt)
                ]));
              })
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      });
    });
    
    it('returns an array in DESC order', function() {
      return new Promise((resolve, reject) => {
        createUserRecursive({username: 'user', password: 'password'}, 3)
          .then(() => {
            pyrope.all({tableName: '_test_users', ascending: false})
              .then(res => {
                let users = res.Items;
                
                resolve(Promise.all([
                  expect(users[2].createdAt).to.be.lessThan(users[1].createdAt),
                  expect(users[1].createdAt).to.be.lessThan(users[0].createdAt)
                ]));
              })
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      });
    });
  });
  
  describe('take()', function() {
    this.timeout(TEST_TIMEOUT);
    before(() => {
      return new Promise((resolve, reject) => {
        resetDatabase()
          .then(() => {
            createUserRecursive({username: 'user', password: 'pass'}, 10)
              .then(() => resolve())
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      });
    });
    
    let cursor;
    
    it('takes the first 3 elements in ASC order', function() {
      return new Promise((resolve, reject) => {
        pyrope.take({tableName: '_test_users', limit: 3})
          .then(res => {
            let users = res.Items;
            
            resolve(Promise.all([
              expect(users).to.have.lengthOf(3),
              expect(users[0].username).to.equal('user10'),
              expect(users[1].username).to.equal('user9'),
              expect(users[2].username).to.equal('user8')
            ]));
          })
          .catch(err => reject(err));
      });
    });
    
    it('takes the first 3 elements in DESC order', function() {
      return new Promise((resolve, reject) => {
        pyrope.take({tableName: '_test_users', limit: 3, ascending: false})
          .then(res => {
            let users = res.Items;
            
            resolve(Promise.all([
              expect(users).to.have.lengthOf(3),
              expect(users[0].username).to.equal('user1'),
              expect(users[1].username).to.equal('user2'),
              expect(users[2].username).to.equal('user3')
            ]));
          })
          .catch(err => reject(err));
      });
    });
    
    it('takes the first 3 elements in ASC order and saves cursor', function() {
      return new Promise((resolve, reject) => {
        pyrope.take({tableName: '_test_users', limit: 3})
          .then(res => {
            let users = res.Items;
            cursor = res.Cursor;
            
            resolve(Promise.all([
              expect(users).to.have.lengthOf(3),
              expect(users[0].username).to.equal('user10'),
              expect(users[1].username).to.equal('user9'),
              expect(users[2].username).to.equal('user8')
            ]));
          })
          .catch(err => reject(err));
      });
    });
    
    it('takes the next 3 elements in ASC order using the cursor', function() {
      return new Promise((resolve, reject) => {
        pyrope.take({tableName: '_test_users', limit: 3, cursor})
          .then(res => {
            let users = res.Items;
            
            resolve(Promise.all([
              expect(users).to.have.lengthOf(3),
              expect(users[0].username).to.equal('user7'),
              expect(users[1].username).to.equal('user6'),
              expect(users[2].username).to.equal('user5')
            ]));
          })
          .catch(err => reject(err));
      });
    });
  });
  
  describe('first()', function() {
    this.timeout(TEST_TIMEOUT);
    before(() => {
      return new Promise((resolve, reject) => {
        resetDatabase()
          .then(() => {
            createUserRecursive({username: 'user', password: 'pass'}, 10)
              .then(() => resolve())
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      });
    });
    
    let cursor;
    
    it('takes the first 3 elements in ASC order', function() {
      return new Promise((resolve, reject) => {
        pyrope.first({tableName: '_test_users', limit: 3})
          .then(res => {
            let users = res.Items;
            
            resolve(Promise.all([
              expect(users).to.have.lengthOf(3),
              expect(users[0].username).to.equal('user10'),
              expect(users[1].username).to.equal('user9'),
              expect(users[2].username).to.equal('user8')
            ]));
          })
          .catch(err => reject(err));
      });
    });
    
    it('takes the first 3 elements in ASC order and saves cursor', function() {
      return new Promise((resolve, reject) => {
        pyrope.first({tableName: '_test_users', limit: 3})
          .then(res => {
            let users = res.Items;
            cursor = res.Cursor;
            
            resolve(Promise.all([
              expect(users).to.have.lengthOf(3),
              expect(users[0].username).to.equal('user10'),
              expect(users[1].username).to.equal('user9'),
              expect(users[2].username).to.equal('user8')
            ]));
          })
          .catch(err => reject(err));
      });
    });
    
    it('takes the next 3 elements in ASC order using the cursor', function() {
      return new Promise((resolve, reject) => {
        pyrope.first({tableName: '_test_users', limit: 3, cursor})
          .then(res => {
            let users = res.Items;
            
            resolve(Promise.all([
              expect(users).to.have.lengthOf(3),
              expect(users[0].username).to.equal('user7'),
              expect(users[1].username).to.equal('user6'),
              expect(users[2].username).to.equal('user5')
            ]));
          })
          .catch(err => reject(err));
      });
    });
  });
  
  describe('last()', function() {
    this.timeout(TEST_TIMEOUT);
    before(() => {
      return new Promise((resolve, reject) => {
        resetDatabase()
          .then(() => {
            createUserRecursive({username: 'user', password: 'pass'}, 10)
              .then(() => resolve())
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      });
    });
    
    let cursor;
    
    it('takes the last 3 elements ', function() {
      return new Promise((resolve, reject) => {
        pyrope.last({tableName: '_test_users', limit: 3})
          .then(res => {
            let users = res.Items;
            
            resolve(Promise.all([
              expect(users).to.have.lengthOf(3),
              expect(users[0].username).to.equal('user1'),
              expect(users[1].username).to.equal('user2'),
              expect(users[2].username).to.equal('user3')
            ]));
          })
          .catch(err => reject(err));
      });
    });
    
    it('takes the last 3 elements and saves cursor', function() {
      return new Promise((resolve, reject) => {
        pyrope.last({tableName: '_test_users', limit: 3})
          .then(res => {
            let users = res.Items;
            cursor = res.Cursor;
            
            resolve(Promise.all([
              expect(users).to.have.lengthOf(3),
              expect(users[0].username).to.equal('user1'),
              expect(users[1].username).to.equal('user2'),
              expect(users[2].username).to.equal('user3')
            ]));
          })
          .catch(err => reject(err));
      });
    });
    
    it('takes the next 3 last elements using the cursor', function() {
      return new Promise((resolve, reject) => {
        pyrope.last({tableName: '_test_users', limit: 3, cursor})
          .then(res => {
            let users = res.Items;
            
            resolve(Promise.all([
              expect(users).to.have.lengthOf(3),
              expect(users[0].username).to.equal('user4'),
              expect(users[1].username).to.equal('user5'),
              expect(users[2].username).to.equal('user6')
            ]));
          })
          .catch(err => reject(err));
      });
    });
  });
  
  describe('findByIndex()', function() {
    this.timeout(TEST_TIMEOUT);
    before(function() {
      return new Promise((resolve, reject) => {
        resetDatabase()
          .then(() => {
            createUser({username: 'john', password: 'password'})
              .then(() => resolve())
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      });
    });
    
    it('finds a user by usernameIndex', function() {
      return new Promise((resolve, reject) => {
        pyrope.findByIndex({
          tableName: '_test_users',
          index: {username: 'john'}
        })
          .then(items => {
            resolve(Promise.all([
              expect(items[0].username).to.equal('john'),
              expect(items[0].password).to.equal('password'),
              expect(items[0]).to.have.property('uuid')
            ]))
          })
          .catch(err => reject(err));
      });
    });
    
    it('returns false when a user is not found', function() {
      return new Promise((resolve, reject) => {
        pyrope.findByIndex({
          tableName: '_test_users',
          index: {username: 'john2'}
        })
          .then(res => {
            resolve(Promise.all([
              expect(res).to.equal(false),
            ]))
          })
          .catch(err => reject(err));
      });
    });
    
    it('returns an array when there are multiple matches', function() {
      return new Promise((resolve, reject) => {
        createUser({username: 'john', password: 'password'})
          .then(() => {
            pyrope.findByIndex({
              tableName: '_test_users',
              index: {username: 'john'}
            })
              .then(items => {
                resolve(Promise.all([
                  expect(items).to.be.an('array'),
                  expect(items).to.be.have.lengthOf(2),
                  expect(items[0]).to.be.have.property('username', 'john'),
                  expect(items[1]).to.be.have.property('username', 'john'),
                ]))
              })
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      });
    });
  });
  
  describe('update()', function() {
    // Resets database and crates test user 'john'
    this.timeout(TEST_TIMEOUT);
    beforeEach(() => new Promise((resolve, reject) => {
      resetDatabase()
        .then(() => {
          createUser({username: 'john', password: 'password'})
          .then(() => resolve())
          .catch(err => reject(err));
        })
        .catch(err => reject(err));
    }));
    
    it('updates the user\'s username looking up the username', () => new Promise((resolve, reject) => {
      pyrope.update({
        tableName: '_test_users',
        index: {username: 'john'},
        attributes: {
          username: 'john2',
          password: 'password2'
        }
      })
        .then(user => {
          resolve(Promise.all([
            expect(user.username).to.equal('john2'),
            expect(user.password).to.equal('password2')
          ]))
        })
        .catch(err => reject(err));
    }));
    
    it('updates the user and returns the correct keys', function() {
      return new Promise((resolve, reject) => {
        pyrope.update({
          tableName: '_test_users',
          index: {username: 'john'},
          attributes: {
            username: 'john2',
            password: 'password2'
          }
        })
          .then(user => {
            resolve(Promise.all([
              expect(user).to.have.any.keys('uuid', 'username', 'password', 'createdAt', 'updatedAt', '_table'),
            ]))
          })
          .catch(err => reject(err));
      })
    });
    
    it('returns false when user is not found', () => new Promise((resolve, reject) => {
      pyrope.update({
        tableName: '_test_users',
        index: {uuid: 'wronguuid', createdAt: 123},
        attributes: {
          username: 'newusername',
          password: 'password2'
        }
      })
        .then(res => {
          resolve(Promise.all([
            expect(res).to.equal.false
          ]));
        })
    }));
    
    it('accepts a before hook to change the arguments before updating', function() {
      return new Promise((resolve, reject) => {
        pyrope.update({
          tableName: '_test_users',
          index: {username: 'john'},
          attributes: {
            password: '123'
          },
          beforeHook: (attrName, attributes) => {
            switch (attrName) {
              case 'password':
                return  {hashedPassword: attributes['password']+'-hashed'};;
              default:
                return {[attrName]: user[attrName]};
            }
          }
        })
          .then(user => {
            resolve(Promise.all([
              expect(user.hashedPassword).to.equal('123-hashed'),
            ]))
          })
          .catch(err => reject(err));
      });
    });
    
    it('Promise rejects if an array is returned', function() {
      return new Promise((resolve, reject) => {
        createUser({username: 'john', password: 'password'})
          .then(() => {
            pyrope.update({
              tableName: '_test_users',
              index: {username: 'john'},
              attributes: {
                password: '123'
              }
            })
              .then(user => reject('Expected the update Promise to reject.'))
              .catch(err => resolve());
          })
          .catch(err => reject(err));
      });
    });
  });
  
  describe('delete()', function() {
    // Resets database and crates test user 'john'
    this.timeout(TEST_TIMEOUT);
    beforeEach(function() {
      return new Promise((resolve, reject) => {
        resetDatabase()
          .then(() => {
            createUser({username: 'john', password: 'password'})
              .then(() => resolve())
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      });
    });
    
    it("deletes the user and returns its attributes", function() {
      return new Promise((resolve, reject) => {
        pyrope.destroy({
          tableName: '_test_users',
          index: {username: 'john'}
        })
          .then(res => {
            pyrope.all({
              tableName: '_test_users',
            })
              .then(list => {
                resolve(Promise.all([
                  expect(res).not.to.equal(false),
                  expect(res).to.have.property('username', 'john'),
                  expect(list.Items).to.have.lengthOf(0)
                ]))
              })
              .catch(err => reject(err));
          })
          .catch(err => reject(err));
      });
    });
  
    it("if the user doesn't exist, return false", () => new Promise((resolve, reject) => {
      pyrope.destroy({
        tableName: '_test_users',
        index: {username: 'john2'}
      })
        .then(res => {
          resolve(Promise.all([
            expect(res).to.equal.false
          ]))
        })
        .catch(err => reject(err))
    }));
  });
});
