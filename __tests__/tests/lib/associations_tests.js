import { expect } from 'chai';
import * as dynamo from '../../../src/lib/dynamodb';
import { findWhere } from 'underscore';
import { v4 } from 'uuid';
import { resetDatabase, createUser, createOrganization, createContact, createOperation, createTransaction } from '../../test_helper';

const TEST_TIMEOUT = 3000;

/*
 * Test DB Schema:
 *
 * Models:
 * - User
 * - Contact
 * - Organization
 * - Operation
 * - Transaction
 *
 * Relationships:
 * - 1:1 ContactUser
 * - 1:N OperationTransaction
 * - N:N ContactOrganization
 *
 */
 
describe('DynamoDB associations', function() {
  describe("1:1 associate()", function() {
    let u1, u2, u3;
    let c1, c2, c3;
  
    this.timeout(TEST_TIMEOUT);
    before(() => resetDatabase()
      .then(() => createUser({})).then(res => u1 = res)
      .then(() => createUser({})).then(res => u2 = res)
      .then(() => createUser({})).then(res => u3 = res)
      .then(() => createContact({})).then(res => c1 = res)
      .then(() => createContact({})).then(res => c2 = res)
      .then(() => createContact({})).then(res => c3 = res)
    );
  
    describe('user(u1).contact = c1', () => {
      it("start with clean table", () => {
        return dynamo.all({
          tableName: '_test_contacts_users'
         
        }).then(res => {
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(0);
        })
      });
    
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_users',
          items: [
            {
              // index: 'user',
              // uuid: [u1.uuid],
              index: {user: [u1.uuid]},
              hasMany: false
            },
            {
              // index: 'contact',
              // uuid: [c1.uuid],
              index: {contact: [c1.uuid]},
              hasMany: false
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("check table", () => {
        return dynamo.all({
          tableName: '_test_contacts_users'
        
        }).then(res => {
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(1);
          expect(res.Items[0]).to.have.property('user', u1.uuid);
          expect(res.Items[0]).to.have.property('contact', c1.uuid);
        })
      });
    });
  
  
    describe('user(u2).contact = c2', () => {
      it("start with clean table", () => {
        return dynamo.all({
          tableName: '_test_contacts_users'
        
        }).then(res => {
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(1);
        })
      });
    
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_users',
          items: [
            {
              // index: 'user',
              // uuid: [u2.uuid],
              index: {user: [u2.uuid]},
              hasMany: false
            },
            {
              // index: 'contact',
              // uuid: [c2.uuid],
              index: {contact: [c2.uuid]},
              hasMany: false
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("check table", () => {
        return dynamo.all({
          tableName: '_test_contacts_users'
        
        }).then(res => {
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(2);
          expect(res.Items[1]).to.have.property('user', u2.uuid);
          expect(res.Items[1]).to.have.property('contact', c2.uuid);
        })
      });
    });
  
  
    describe('user(u3).contact = c3', () => {
      it("start with clean table", () => {
        return dynamo.all({
          tableName: '_test_contacts_users'
        
        }).then(res => {
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(2);
        })
      });
    
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_users',
          items: [
            {
              // index: 'user',
              // uuid: [u3.uuid],
              index: {user: [u3.uuid]},
              hasMany: false
            },
            {
              // index: 'contact',
              // uuid: [c3.uuid],
              index: {contact: c3.uuid},
              hasMany: false
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("check table", () => {
        return dynamo.all({
          tableName: '_test_contacts_users'
        
        }).then(res => {
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(3);
          expect(res.Items[2]).to.have.property('user', u3.uuid);
          expect(res.Items[2]).to.have.property('contact', c3.uuid);
        })
      });
    });
  
  
    describe('user(u2).contact = c1', () => {
      it("start with clean table", () => {
        return dynamo.all({
          tableName: '_test_contacts_users'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(3);
        })
      });
    
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_users',
          items: [
            {
              // index: 'user',
              // uuid: [u2.uuid],
              index: {user: [u2.uuid]},
              hasMany: false
            },
            {
              // index: 'contact',
              // uuid: [c1.uuid],
              index: {contact: [c1.uuid]},
              hasMany: false
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("check table", () => {
        return dynamo.all({
          tableName: '_test_contacts_users'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(2);
          expect(res.Items[0]).to.have.property('user', u3.uuid);
          expect(res.Items[0]).to.have.property('contact', c3.uuid);
          expect(res.Items[1]).to.have.property('user', u2.uuid);
          expect(res.Items[1]).to.have.property('contact', c1.uuid);
        })
      });
    });
  
    describe('contact(c3).user = u2', () => {
      it("start with clean table", () => {
        return dynamo.all({
          tableName: '_test_contacts_users'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(2);
        })
      });
    
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_users',
          items: [
            {
              // index: 'contact',
              // uuid: [c3.uuid],
              index: {contact: [c3.uuid]},
              hasMany: false
            },
            {
              // index: 'user',
              // uuid: [u2.uuid],
              index: {user: [u2.uuid]},
              hasMany: false
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("check table", () => {
        return dynamo.all({
          tableName: '_test_contacts_users'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(1);
          expect(res.Items[0]).to.have.property('user', u2.uuid);
          expect(res.Items[0]).to.have.property('contact', c3.uuid);
        })
      });
    });
  
    describe('dissociate(c3).user(u2)', () => {
      it("make dissociaton", () => {
        return dynamo.dissociate({
          tableName: '_test_contacts_users',
          items: [
            {
              // index: 'contact',
              // uuid: c3.uuid
              index: {contact: c3.uuid},
            },
            {
              // index: 'user',
              // uuid: u2.uuid
              index: {user: u2.uuid},
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
     
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_users'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(0);
        })
      });
    });
  });
    
  describe("1:N associate()", function() {
    let o1, o2, o3;
    let t1, t2, t3, t4, t5, t6;
  
    this.timeout(TEST_TIMEOUT);
    before(() => resetDatabase()
      .then(() => createOperation({})).then(res => o1 = res)
      .then(() => createOperation({})).then(res => o2 = res)
      .then(() => createOperation({})).then(res => o3 = res)
      .then(() => createTransaction({})).then(res => t1 = res)
      .then(() => createTransaction({})).then(res => t2 = res)
      .then(() => createTransaction({})).then(res => t3 = res)
      .then(() => createTransaction({})).then(res => t4 = res)
      .then(() => createTransaction({})).then(res => t5 = res)
      .then(() => createTransaction({})).then(res => t6 = res)
    );
  
    describe('operation(o1).transactions << [t1, t2]', () => {
      it("pre table check", () => {
        return dynamo.all({
          tableName: '_test_operations_transactions'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(0);
        })
      });
    
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_operations_transactions',
          items: [
            {
              // index: 'operation',
              // uuid: o1.uuid,
              index: {operation: o1.uuid},
              hasMany: true
            },
            {
              // index: 'transaction',
              // uuid: [t1.uuid, t2.uuid],
              index: {transaction: [t1.uuid, t2.uuid]},
              hasMany: false
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_operations_transactions'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(2);
          expect(res.Items[0]).to.have.property('operation', o1.uuid);
          expect(res.Items[0]).to.have.property('transaction', t1.uuid);
          expect(res.Items[1]).to.have.property('operation', o1.uuid);
          expect(res.Items[1]).to.have.property('transaction', t2.uuid);
        })
      });
    });
  
    describe('operation(o1).transactions << t3', () => {
      it("pre table check", () => {
        return dynamo.all({
          tableName: '_test_operations_transactions'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(2);
        })
      });
    
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_operations_transactions',
          items: [
            {
              // index: 'operation',
              // uuid: [o1.uuid],
              index: {operation: o1.uuid},
              hasMany: true
            },
            {
              // index: 'transaction',
              // uuid: t3.uuid,
              index: {transaction: t3.uuid},
              hasMany: false
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_operations_transactions'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(3);
          expect(res.Items[0]).to.have.property('operation', o1.uuid);
          expect(res.Items[0]).to.have.property('transaction', t1.uuid);
          expect(res.Items[1]).to.have.property('operation', o1.uuid);
          expect(res.Items[1]).to.have.property('transaction', t2.uuid);
          expect(res.Items[2]).to.have.property('operation', o1.uuid);
          expect(res.Items[2]).to.have.property('transaction', t3.uuid);
        })
      });
    });
  
    describe('operation(o2).transactions << [t4, t5]', () => {
      it("pre table check", () => {
        return dynamo.all({
          tableName: '_test_operations_transactions'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(3);
        })
      });
    
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_operations_transactions',
          items: [
            {
              // index: 'operation',
              // uuid: [o2.uuid],
              index: {operation: o2.uuid},
              hasMany: true
            },
            {
              // index: 'transaction',
              // uuid: [t4.uuid, t5.uuid],
              index: {transaction: [t4.uuid, t5.uuid]},
              hasMany: false
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_operations_transactions'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(5);
          expect(res.Items[0]).to.have.property('operation', o1.uuid);
          expect(res.Items[0]).to.have.property('transaction', t1.uuid);
          expect(res.Items[1]).to.have.property('operation', o1.uuid);
          expect(res.Items[1]).to.have.property('transaction', t2.uuid);
          expect(res.Items[2]).to.have.property('operation', o1.uuid);
          expect(res.Items[2]).to.have.property('transaction', t3.uuid);
          expect(res.Items[3]).to.have.property('operation', o2.uuid);
          expect(res.Items[3]).to.have.property('transaction', t4.uuid);
          expect(res.Items[4]).to.have.property('operation', o2.uuid);
          expect(res.Items[4]).to.have.property('transaction', t5.uuid);
        })
      });
    });
  
    describe('operation(o1).transactions << [t1, t4]', () => {
      it("pre table check", () => {
        return dynamo.all({
          tableName: '_test_operations_transactions'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(5);
        })
      });
    
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_operations_transactions',
          items: [
            {
              // index: 'operation',
              // uuid: [o1.uuid],
              index: {operation: [o1.uuid]},
              hasMany: true
            },
            {
              // index: 'transaction',
              // uuid: [t1.uuid, t4.uuid],
              index: {transaction: [t1.uuid, t4.uuid]},
              hasMany: false
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_operations_transactions'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(5);
          expect(res.Items[0]).to.have.property('operation', o1.uuid);
          expect(res.Items[0]).to.have.property('transaction', t2.uuid);
          expect(res.Items[1]).to.have.property('operation', o1.uuid);
          expect(res.Items[1]).to.have.property('transaction', t3.uuid);
          expect(res.Items[2]).to.have.property('operation', o2.uuid);
          expect(res.Items[2]).to.have.property('transaction', t5.uuid);
          expect(res.Items[3]).to.have.property('operation', o1.uuid);
          expect(res.Items[3]).to.have.property('transaction', t1.uuid);
          expect(res.Items[4]).to.have.property('operation', o1.uuid);
          expect(res.Items[4]).to.have.property('transaction', t4.uuid);
        })
      });
    });
  
    describe('operation(o2).transactions << [t1, t2, t6]', () => {
      it("pre table check", () => {
        return dynamo.all({
          tableName: '_test_operations_transactions'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(5);
        })
      });
    
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_operations_transactions',
          items: [
            {
              // index: 'operation',
              // uuid: [o2.uuid],
              index: {operation: [o2.uuid]},
              hasMany: true
            },
            {
              // index: 'transaction',
              // uuid: [t1.uuid, t2.uuid, t6.uuid],
              index: {transaction: [t1.uuid, t2.uuid, t6.uuid]},
              hasMany: false
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_operations_transactions'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(6);
          expect(res.Items[0]).to.have.property('operation', o1.uuid);
          expect(res.Items[0]).to.have.property('transaction', t3.uuid);
          expect(res.Items[1]).to.have.property('operation', o2.uuid);
          expect(res.Items[1]).to.have.property('transaction', t5.uuid);
          expect(res.Items[2]).to.have.property('operation', o1.uuid);
          expect(res.Items[2]).to.have.property('transaction', t4.uuid);
          expect(res.Items[3]).to.have.property('operation', o2.uuid);
          expect(res.Items[3]).to.have.property('transaction', t1.uuid);
          expect(res.Items[4]).to.have.property('operation', o2.uuid);
          expect(res.Items[4]).to.have.property('transaction', t2.uuid);
          expect(res.Items[5]).to.have.property('operation', o2.uuid);
          expect(res.Items[5]).to.have.property('transaction', t6.uuid);
        })
      });
  
      describe('dissociate(o1).transaction(null)', () => {
        it("make dissociaton", () => {
          return dynamo.dissociate({
            tableName: '_test_operations_transactions',
            items: [
              {
                // index: 'operation',
                // uuid: o1.uuid
                index: {operation: o1.uuid}
              },
              {
                index: {transaction: null},
                // index: 'transaction',
                // uuid: null
              }
            ]
          }).then(res => {
            expect(res).to.equal(true);
          })
        });
    
        it("post table check", () => {
          return dynamo.all({
            tableName: '_test_operations_transactions'
        
          }).then(res => {
            // console.log(JSON.stringify(res, null, 2));
        
            expect(res).to.have.property('Items');
            expect(res.Items).to.have.lengthOf(4);
            expect(res.Items[0]).to.have.property('operation', o2.uuid);
            expect(res.Items[0]).to.have.property('transaction', t5.uuid);
            expect(res.Items[1]).to.have.property('operation', o2.uuid);
            expect(res.Items[1]).to.have.property('transaction', t1.uuid);
            expect(res.Items[2]).to.have.property('operation', o2.uuid);
            expect(res.Items[2]).to.have.property('transaction', t2.uuid);
            expect(res.Items[3]).to.have.property('operation', o2.uuid);
            expect(res.Items[3]).to.have.property('transaction', t6.uuid);
          })
        });
      });
  
      describe('dissociate(o1).transaction(t1)', () => {
        it("make dissociaton", () => {
          return dynamo.dissociate({
            tableName: '_test_operations_transactions',
            items: [
              {
                // index: 'operation',
                // uuid: o2.uuid
                index: {operation: o2.uuid}
              },
              {
                // index: 'transaction',
                // uuid: t1.uuid
                index: {transaction: t1.uuid}
              }
            ]
          }).then(res => {
            expect(res).to.equal(true);
          });
        });
    
        it("post table check", () => {
          return dynamo.all({
            tableName: '_test_operations_transactions'
        
          }).then(res => {
            // console.log(JSON.stringify(res, null, 2));
        
            expect(res).to.have.property('Items');
            expect(res.Items).to.have.lengthOf(3);
            expect(res.Items[0]).to.have.property('operation', o2.uuid);
            expect(res.Items[0]).to.have.property('transaction', t5.uuid);
            expect(res.Items[1]).to.have.property('operation', o2.uuid);
            expect(res.Items[1]).to.have.property('transaction', t2.uuid);
            expect(res.Items[2]).to.have.property('operation', o2.uuid);
            expect(res.Items[2]).to.have.property('transaction', t6.uuid);
          })
        });
      });
  
      describe('dissociate(o1).transaction([t5, 56)', () => {
        it("make dissociaton", () => {
          return dynamo.dissociate({
            tableName: '_test_operations_transactions',
            items: [
              {
                // index: 'operation',
                // uuid: o2.uuid
                index: {operation: o2.uuid}
              },
              {
                // index: 'transaction',
                // uuid: [t5.uuid, t6.uuid]
                index: {transaction: [t5.uuid, t6.uuid]}
              }
            ]
          }).then(res => {
            expect(res).to.equal(true);
          })
        });
    
        it("post table check", () => {
          return dynamo.all({
            tableName: '_test_operations_transactions'
        
          }).then(res => {
            // console.log(JSON.stringify(res, null, 2));
        
            expect(res).to.have.property('Items');
            expect(res.Items).to.have.lengthOf(1);
            expect(res.Items[0]).to.have.property('operation', o2.uuid);
            expect(res.Items[0]).to.have.property('transaction', t2.uuid);
          })
        });
      });
      
    });
    
  });
  
  describe("N:N associate()", function() {
    let o1, o2, o3, o4, o5, o6;
    let c1, c2, c3, c4, c5, c6;
    
    this.timeout(TEST_TIMEOUT);
    before(() => resetDatabase()
      .then(() => createOrganization({})).then(res => o1 = res)
      .then(() => createOrganization({})).then(res => o2 = res)
      .then(() => createOrganization({})).then(res => o3 = res)
      .then(() => createOrganization({})).then(res => o4 = res)
      .then(() => createOrganization({})).then(res => o5 = res)
      .then(() => createOrganization({})).then(res => o6 = res)
      .then(() => createContact({})).then(res => c1 = res)
      .then(() => createContact({})).then(res => c2 = res)
      .then(() => createContact({})).then(res => c3 = res)
      .then(() => createContact({})).then(res => c4 = res)
      .then(() => createContact({})).then(res => c5 = res)
      .then(() => createContact({})).then(res => c6 = res)
    );
    
    describe('organization(o1).contact << c1', () => {
      it("pre table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
          
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
          
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(0);
        })
      });
      
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'organization',
              // uuid: o1.uuid,
              index: {organization: o1.uuid},
              hasMany: true
            },
            {
              // index: 'contact',
              // uuid: c1.uuid,
              index: {contact: c1.uuid},
              hasMany: true
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
      
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
          
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
          
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(1);
          expect(res.Items[0]).to.have.property('organization', o1.uuid);
          expect(res.Items[0]).to.have.property('contact', c1.uuid);
        })
      });
    });
  
    describe('organization(o1).contact << [c2, c3]', () => {
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'organization',
              // uuid: o1.uuid,
              index: {organization: o1.uuid},
              hasMany: true
            },
            {
              // index: 'contact',
              // uuid: [c2.uuid, c3.uuid],
              index: {contact: [c2.uuid, c3.uuid]},
              hasMany: true
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(3);
          expect(res.Items[0]).to.have.property('organization', o1.uuid);
          expect(res.Items[0]).to.have.property('contact', c1.uuid);
          expect(res.Items[1]).to.have.property('organization', o1.uuid);
          expect(res.Items[1]).to.have.property('contact', c2.uuid);
          expect(res.Items[2]).to.have.property('organization', o1.uuid);
          expect(res.Items[2]).to.have.property('contact', c3.uuid);
        })
      });
    });
   
    describe('contact(c1).organization << o1', () => {
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'contact',
              // uuid: c1.uuid,
              index: {contact: c1.uuid},
              hasMany: true
            },
            {
              // index: 'organization',
              // uuid: o1.uuid,
              index: {organization: o1.uuid},
              hasMany: true
            }
          ]
        }).then(res => {
          expect(res).to.equal(false);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(3);
          expect(res.Items[0]).to.have.property('organization', o1.uuid);
          expect(res.Items[0]).to.have.property('contact', c1.uuid);
          expect(res.Items[1]).to.have.property('organization', o1.uuid);
          expect(res.Items[1]).to.have.property('contact', c2.uuid);
          expect(res.Items[2]).to.have.property('organization', o1.uuid);
          expect(res.Items[2]).to.have.property('contact', c3.uuid);
        })
      });
    });
  
    describe('contact(c1).organization << [o1, o2]', () => {
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'contact',
              // uuid: c1.uuid,
              index: {contact: c1.uuid},
              hasMany: true
            },
            {
              // index: 'organization',
              // uuid: [o1.uuid, o2.uuid],
              index: {organization: [o1.uuid, o2.uuid]},
              hasMany: true
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(4);
          expect(res.Items[0]).to.have.property('organization', o1.uuid);
          expect(res.Items[0]).to.have.property('contact', c1.uuid);
          expect(res.Items[1]).to.have.property('organization', o1.uuid);
          expect(res.Items[1]).to.have.property('contact', c2.uuid);
          expect(res.Items[2]).to.have.property('organization', o1.uuid);
          expect(res.Items[2]).to.have.property('contact', c3.uuid);
          expect(res.Items[3]).to.have.property('organization', o2.uuid);
          expect(res.Items[3]).to.have.property('contact', c1.uuid);
        })
      });
    });
  
    describe('organization(o1).contact << [c1, c2, c4]', () => {
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'organization',
              // uuid: o1.uuid,
              index: {organization: o1.uuid},
              hasMany: true
            },
            {
              // index: 'contact',
              // uuid: [c1.uuid, c2.uuid, c4.uuid],
              index: {contact: [c1.uuid, c2.uuid, c4.uuid]},
              hasMany: true
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(5);
          expect(res.Items[0]).to.have.property('organization', o1.uuid);
          expect(res.Items[0]).to.have.property('contact', c1.uuid);
          expect(res.Items[1]).to.have.property('organization', o1.uuid);
          expect(res.Items[1]).to.have.property('contact', c2.uuid);
          expect(res.Items[2]).to.have.property('organization', o1.uuid);
          expect(res.Items[2]).to.have.property('contact', c3.uuid);
          expect(res.Items[3]).to.have.property('organization', o2.uuid);
          expect(res.Items[3]).to.have.property('contact', c1.uuid);
          expect(res.Items[4]).to.have.property('organization', o1.uuid);
          expect(res.Items[4]).to.have.property('contact', c4.uuid);
        })
      });
    });
  
    describe('organization([o1, o2]).contact << [c2, c1, c4]', () => {
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'organization',
              // uuid: [o1.uuid, o2.uuid],
              index: {organization: [o1.uuid, o2.uuid]},
              hasMany: true
            },
            {
              // index: 'contact',
              // uuid: [c2.uuid, c1.uuid, c4.uuid],
              index: {contact: [c2.uuid, c1.uuid, c4.uuid]},
              hasMany: true
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(7);
          expect(res.Items[0]).to.have.property('organization', o1.uuid);
          expect(res.Items[0]).to.have.property('contact', c1.uuid);
          expect(res.Items[1]).to.have.property('organization', o1.uuid);
          expect(res.Items[1]).to.have.property('contact', c2.uuid);
          expect(res.Items[2]).to.have.property('organization', o1.uuid);
          expect(res.Items[2]).to.have.property('contact', c3.uuid);
          expect(res.Items[3]).to.have.property('organization', o2.uuid);
          expect(res.Items[3]).to.have.property('contact', c1.uuid);
          expect(res.Items[4]).to.have.property('organization', o1.uuid);
          expect(res.Items[4]).to.have.property('contact', c4.uuid);
          expect(res.Items[5]).to.have.property('organization', o2.uuid);
          expect(res.Items[5]).to.have.property('contact', c2.uuid);
          expect(res.Items[6]).to.have.property('organization', o2.uuid);
          expect(res.Items[6]).to.have.property('contact', c4.uuid);
        })
      });
    });
    
    describe('contact(c1).organization << [o2, o3]', () => {
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'contact',
              // uuid: [c1.uuid],
              index: {contact: [c1.uuid]},
              hasMany: true
            },
            {
              // index: 'organization',
              // uuid: [o2.uuid, o3.uuid],
              index: {organization: [o2.uuid, o3.uuid]},
              hasMany: true
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(8);
          expect(res.Items[0]).to.have.property('organization', o1.uuid);
          expect(res.Items[0]).to.have.property('contact', c1.uuid);
          expect(res.Items[1]).to.have.property('organization', o1.uuid);
          expect(res.Items[1]).to.have.property('contact', c2.uuid);
          expect(res.Items[2]).to.have.property('organization', o1.uuid);
          expect(res.Items[2]).to.have.property('contact', c3.uuid);
          expect(res.Items[3]).to.have.property('organization', o2.uuid);
          expect(res.Items[3]).to.have.property('contact', c1.uuid);
          expect(res.Items[4]).to.have.property('organization', o1.uuid);
          expect(res.Items[4]).to.have.property('contact', c4.uuid);
          expect(res.Items[5]).to.have.property('organization', o2.uuid);
          expect(res.Items[5]).to.have.property('contact', c2.uuid);
          expect(res.Items[6]).to.have.property('organization', o2.uuid);
          expect(res.Items[6]).to.have.property('contact', c4.uuid);
          expect(res.Items[7]).to.have.property('organization', o3.uuid);
          expect(res.Items[7]).to.have.property('contact', c1.uuid);
        })
      });
    });
  
    describe('organization(o1!).contact =  c1', () => {
      it("make association", () => {
        return dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'organization',
              // uuid: o1.uuid,
              index: {organization: o1.uuid},
              hasMany: false
            },
            {
              // index: 'contact',
              // uuid: c1.uuid,
              index: {contact: c1.uuid},
              hasMany: true
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(5);
          expect(res.Items[0]).to.have.property('organization', o2.uuid);
          expect(res.Items[0]).to.have.property('contact', c1.uuid);
          expect(res.Items[1]).to.have.property('organization', o2.uuid);
          expect(res.Items[1]).to.have.property('contact', c2.uuid);
          expect(res.Items[2]).to.have.property('organization', o2.uuid);
          expect(res.Items[2]).to.have.property('contact', c4.uuid);
          expect(res.Items[3]).to.have.property('organization', o3.uuid);
          expect(res.Items[3]).to.have.property('contact', c1.uuid);
          expect(res.Items[4]).to.have.property('organization', o1.uuid);
          expect(res.Items[4]).to.have.property('contact', c1.uuid);
        })
      });
    });
  
    describe('dissociate(c4, null)', () => {
      it("make dissociaton", () => {
        return dynamo.dissociate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'contact',
              // uuid: c4.uuid
              index: {contact: c4.uuid}
            },
            {
              // index: 'organization',
              // uuid: null
              index: {organization: null}
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(4);
          expect(res.Items[0]).to.have.property('contact', c1.uuid);
          expect(res.Items[0]).to.have.property('organization', o2.uuid);
          expect(res.Items[1]).to.have.property('contact', c2.uuid);
          expect(res.Items[1]).to.have.property('organization', o2.uuid);
          expect(res.Items[2]).to.have.property('contact', c1.uuid);
          expect(res.Items[2]).to.have.property('organization', o3.uuid);
          expect(res.Items[3]).to.have.property('contact', c1.uuid);
          expect(res.Items[3]).to.have.property('organization', o1.uuid);
        })
      });
    });
  
    describe('dissociate(o2, c1)', () => {
      it("make dissociaton", () => {
        return dynamo.dissociate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'organization',
              // uuid: o2.uuid
              index: {organization: o2.uuid}
            },
            {
              // index: 'contact',
              // uuid: c1.uuid
              index: {contact: c1.uuid}
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(3);
          expect(res.Items[0]).to.have.property('contact', c2.uuid);
          expect(res.Items[0]).to.have.property('organization', o2.uuid);
          expect(res.Items[1]).to.have.property('contact', c1.uuid);
          expect(res.Items[1]).to.have.property('organization', o3.uuid);
          expect(res.Items[2]).to.have.property('contact', c1.uuid);
          expect(res.Items[2]).to.have.property('organization', o1.uuid);
        })
      });
    });
  
    describe('dissociate(c1, [o3, o1])', () => {
      it("make dissociaton", () => {
        return dynamo.dissociate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'contact',
              // uuid: c1.uuid
              index: {contact: c1.uuid}
            },
            {
              // index: 'organization',
              // uuid: [o3.uuid, o1.uuid]
              index: {organization: [o3.uuid, o1.uuid]}
            }
          ]
        }).then(res => {
          expect(res).to.equal(true);
        })
      });
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(1);
          expect(res.Items[0]).to.have.property('contact', c2.uuid);
          expect(res.Items[0]).to.have.property('organization', o2.uuid);
        })
      });
    });
  
    describe('dissociate(c1, o3) = false', () => {
      it("make dissociaton", () => new Promise((resolve, reject) => {
        dynamo.dissociate({
          tableName: '_test_contacts_organizations',
          items: [
            {index: {contact: c1.uuid}},
            {index: {organization: o3.uuid}}
          ]
        }).then((res) => {
          resolve(Promise.all([
            expect(res).to.be.false
          ]));
        })
      }));
    
      it("post table check", () => {
        return dynamo.all({
          tableName: '_test_contacts_organizations'
        
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
        
          expect(res).to.have.property('Items');
          expect(res.Items).to.have.lengthOf(1);
          expect(res.Items[0]).to.have.property('contact', c2.uuid);
          expect(res.Items[0]).to.have.property('organization', o2.uuid);
        })
      });
    });
    
  });
  
  describe("Get associations", function() {
    let o1, o2, o3, o4, o5, o6;
    let c1, c2, c3, c4, c5, c6;
  
    this.timeout(TEST_TIMEOUT);
    before(() => resetDatabase()
      .then(() => createOrganization({})).then(res => o1 = res)
      .then(() => createOrganization({})).then(res => o2 = res)
      .then(() => createOrganization({})).then(res => o3 = res)
      .then(() => createOrganization({})).then(res => o4 = res)
      .then(() => createOrganization({})).then(res => o5 = res)
      .then(() => createOrganization({})).then(res => o6 = res)
      .then(() => createContact({})).then(res => c1 = res)
      .then(() => createContact({})).then(res => c2 = res)
      .then(() => createContact({})).then(res => c3 = res)
      .then(() => createContact({})).then(res => c4 = res)
      .then(() => createContact({})).then(res => c5 = res)
      .then(() => createContact({})).then(res => c6 = res)
    );
    
    /*
 
     Table:
     uuid	organization	contact
     0	  o1	          c1
     1	  o1	          c2
     2	  o1	          c3
     3	  o2	          c1
     4	  o3	          c2
     5	  o4	          c4
     
     Expected associations:
     o1:	c1, c2, c3
     o2:	c1
     o3:	c2
     o4:	c4
 
     c1:	o1, o2
     c2:	o1, o3
     c3:	o1
     c4:	o4
    
     */
    
    describe('associate o1..4 with c1..4', () => {
      it('Generates associations', () => new Promise((resolve, reject) => {
        dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              index: {organization: o1.uuid},
              hasMany: true
            },
            {
              // index: 'contact',
              // uuid: [c1.uuid, c2.uuid, c3.uuid],
              index: {contact: [c1.uuid, c2.uuid, c3.uuid]},
              hasMany: true
            }
          ]
        }).then(() => dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'organization',
              // uuid: o2.uuid,
              index: {organization: o2.uuid},
              hasMany: true
            },
            {
              // index: 'contact',
              // uuid: [c1.uuid],
              index: {contact: [c1.uuid]},
              hasMany: true
            }
          ]
        })).then(() => dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'organization',
              // uuid: [o3.uuid],
              index: {organization: [o3.uuid]},
              hasMany: true
            },
            {
              // index: 'contact',
              // uuid: [c2.uuid],
              index: {contact: [c2.uuid]},
              hasMany: true
            }
          ]
        })).then(() => dynamo.associate({
          tableName: '_test_contacts_organizations',
          items: [
            {
              // index: 'organization',
              // uuid: o4.uuid,
              index: {organization: o4.uuid},
              hasMany: true
            },
            {
              // index: 'contact',
              // uuid: c4.uuid,
              index: {contact: c4.uuid},
              hasMany: true
            }
          ]
        }))
          .then(res => resolve(res))
          .catch(err => reject(err))
      }));
    
      it('Checks table', () => new Promise((resolve, reject) => {
        dynamo.all({
          tableName: '_test_contacts_organizations'
        }).then(res => {
          // console.log(JSON.stringify(res, null, 2));
          
          resolve(Promise.all([
            expect(res.Items).not.to.equal(undefined),
            expect(res.Items).to.have.lengthOf(6)
          ]))
        }).catch(err => reject(err))
      }));
   
      it('Gets associations', () => {
        // Mock associations:
        // o1.uuid = 'o1';
        // o2.uuid = 'o2';
        // o3.uuid = 'o3';
        // o4.uuid = 'o4';
        //
        // c1.uuid = 'c1';
        // c2.uuid = 'c2';
        // c3.uuid = 'c3';
        // c4.uuid = 'c4';
  
        // o1, o2, o3, o4
        return dynamo.getAssociations({
          tableName: '_test_contacts_organizations',
          items: [
            {index: {organization: o1.uuid}},
            {index: 'contact'}
          ]
        }).then(res => Promise.all([
          expect(res).to.be.an('array'),
          expect(res).to.have.members([
            c1.uuid,c2.uuid,c3.uuid
          ])
        ])).then(() => dynamo.getAssociations({
          tableName: '_test_contacts_organizations',
          items: [
            {index: {organization: o2.uuid}},
            {index: 'contact'}
          ]
        })).then(res => Promise.all([
          expect(res).to.be.an('array'),
          expect(res).to.have.members([
            c1.uuid
          ])
        ])).then(() => dynamo.getAssociations({
          tableName: '_test_contacts_organizations',
          items: [
            {index: {organization: o3.uuid}},
            {index: 'contact'}
          ]
        })).then(res => Promise.all([
          expect(res).to.be.an('array'),
          expect(res).to.have.members([
            c2.uuid
          ])
        ])).then(() => dynamo.getAssociations({
          tableName: '_test_contacts_organizations',
          items: [
            {index: {organization: o4.uuid}},
            {index: 'contact'}
          ]
        })).then(res => Promise.all([
          expect(res).to.be.an('array'),
          expect(res).to.have.members([
            c4.uuid
          ])
        ]))
          
        // c1, c2, c3, c4
          .then(() => dynamo.getAssociations({
            tableName: '_test_contacts_organizations',
            items: [
              {index: {contact: c1.uuid}},
              {index: 'organization'}
            ]
          })).then(res => Promise.all([
          expect(res).to.be.an('array'),
          expect(res).to.have.members([
            o1.uuid, o2.uuid
          ])
        ])).then(() => dynamo.getAssociations({
          tableName: '_test_contacts_organizations',
            items: [
              {index: {contact: c2.uuid}},
              {index: 'organization'}
            ]
        })).then(res => Promise.all([
          expect(res).to.be.an('array'),
          expect(res).to.have.members([
            o1.uuid, o3.uuid
          ])
        ])).then(() => dynamo.getAssociations({
          tableName: '_test_contacts_organizations',
            items: [
              {index: {contact: c3.uuid}},
              {index: 'organization'}
            ]
        })).then(res => Promise.all([
          expect(res).to.be.an('array'),
          expect(res).to.have.members([
            o1.uuid
          ])
        ])).then(() => dynamo.getAssociations({
          tableName: '_test_contacts_organizations',
            items: [
              {index: {contact: c4.uuid}},
              {index: 'organization'}
            ]
        })).then(res => Promise.all([
          expect(res).to.be.an('array'),
          expect(res).to.have.members([
            o4.uuid
          ])
        ]))
        
      });
    });
  
  
  });
});
