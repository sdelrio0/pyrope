import * as pyrope from './index';
import { filter, isArray, isObject, sortBy, find, isString, mapObject, omit, each, isFunction } from 'underscore';
import Inflector from 'inflected';
import { buildAssociationTableName, buildItemIndices } from './utils';

import { PyropeActions } from './index';

const DEBUG = false;

const log = (msg, json) => {if(DEBUG) {console.log(`----------------------------\n${msg}${json ? JSON.stringify(json, null, 2) : ''}\n`)}};

/**
 * PyropeModel ORM
 */
export default class PyropeModel {
  static name;
  static fields;
  static tablePrefix;
  static tableName;
  static tableSuffix;
  static fullTableName;
  static validations;
  static defaultQueryKey;
  static actions;
  
  /**
   * PyropeModel#constructor
   *
   * Generates a new PyropeModel object.
   * Useful for interacting with DynamoDB with ease.
   *
   * @param {GraphQLObjectType} schema - The GraphQL Object Type.
   * @param {object} opts - The options object.
   * @param {string} opts.name - Custom name (used to calculate table names).
   * @param {string} opts.tablePrefix - Custom table to query from.
   * @param {string} opts.tableName - Custom table to query from.
   * @param {string} opts.tableSuffix - Custom table to query from.
   * @param {function(fields: object, fieldName: string): object} opts.validations - Validation function, should resolve the [modified] fields.
   */
  constructor(schema, opts = {}) {
    if(!schema) throw new Error(`PyropeModel#constructor(): 'schema' is undefined.`);
    if(!schema.name) throw new Error(`PyropeModel#constructor(): 'schema.name' is undefined.`);
    if(!schema._typeConfig.fields) throw new Error(`PyropeModel#constructor(): 'schema.fields' is undefined.`);
    
    this.name = opts.name || schema.name;
    this.fields = schema._typeConfig.fields();
    this.defaultQueryKey = 'uuid';  // opts.defaultQueryKey || 'uuid'; // todo: implement defaultQueryKey
    this.validations = opts.validations;
    
    this.tablePrefix = opts.tablePrefix || '';
    this.tableSuffix = opts.tableSuffix || '';
    this.tableName = opts.tableName || Inflector.tableize(schema.name);
    this.fullTableName = this.tablePrefix + this.tableName + this.tableSuffix;
    
    this.actions = new PyropeActions({tablePrefix: this.tablePrefix, tableName: this.tableName, tableSuffix: this.tableSuffix})
  }
  
  /**
   * Retrieve a record given an index
   *
   * @param {object} index - The index used to query the record.
   * @param {any} index.key - The index key used to query the record.
   * @param {any} index.value - The index value used to query the record.
   * @returns {Promise<object|boolean>} - The retrieved record map. False if record is not found.
   */
  get(index) {
    return new Promise((resolve, reject) => {
      if(!index || !isObject(index)) return reject(`PyropeModel#get(): 'index' is undefined or not an object.`);
      
      this.actions.findByIndex({
        index
      })
        .then(records => {
          if(records === false) {
            resolve(false);
          } else if(isArray(records) && records.length > 1) {
            reject('PyropeModel#get(): More than one item with the specified index were found.');
          } else {
            resolve(records[0])
          }
        })
        .catch(err => reject(`PyropeModel#get() > ${err}`));
    });
  }
  
  /**
   * Retrieve all records
   *
   * @param {object} opts - Options object.
   * @param {string} opts.order - Sort by 'asc' or 'desc'
   * @param {number} opts.limit - The amount of records to retrieve.
   * @param {string} opts.cursor - The cursor from which the query continues.
   * @returns {Promise<Array<object>>} - An array with the maps of the retrieved objects. Empty array if none is found.
   */
  getAll(opts = {}) {
    return new Promise((resolve, reject) => {
      this.actions.all(opts)
        .then(records => {
          if(records.Cursor) {
            records.Items[records.Items.length-1].cursor = records.Cursor; // assign cursor to the last item
          }
      
          resolve(records.Items)
        })
        .catch(err => reject(`PyropeModel#getAll() > ${err}`));
    });
  }
  
  /**
   * Create a new record
   *
   * (!) It does not check if a record with the provided index previously exists.
   *
   * @param {object} fields - Fields to the new record.
   * @param {object} opts - Options object.
   * @param {function(fields: object, fieldName: string): object} opts.beforeValidation - beforeValidation hook, should return the [modified] fields.
   * @param {function(fields: object, fieldName: string): object} opts.afterValidation - afterValidation hook, should return the [modified] fields.
   * @param {function(fields: object, fieldName: string): object} opts.beforeCreate - beforeCreate hook, should return the [modified] fields.
   * @param {function(fields: object, fieldName: string): object} opts.afterCreate - afterCreate hook, should return the [modified] fields.
   * @param {string} opts.fieldName - fieldName. Passed by the resolver function from GraphQL. ie. the name of the Query or Mutation.
   * @returns {Promise<object>} - A promise that resolves to the newly created record.
   */
  create(fields = {}, opts = {}) {
    return new Promise((resolve, reject) => {
      if(!fields || !isObject(fields)) return reject(`PyropeModel#create(): 'fields' is undefined or not an object.`);
      if(opts && !isObject(opts)) return reject(`PyropeModel#create(): 'opts' is not an object.`);
      
      const {
        beforeValidation,
        afterValidation,
        beforeCreate,
        afterCreate,
        fieldName
      } = opts;
      
      const emptyHook = (fields) => new Promise((resolve, reject) => resolve(fields));
      
      const createHook = (fields, fieldName) => new Promise((res, rej) => {
        this.actions.create({fields})
        .then(record => res(record))
        .catch(err => rej(`createHook() > ${err}`));
      });
  
      let hookChain = [];
      
      hookChain.push(beforeValidation || emptyHook);
      hookChain.push(this.validations || emptyHook);
      hookChain.push(afterValidation  || emptyHook);
      hookChain.push(beforeCreate     || emptyHook);
      hookChain.push(createHook);
      hookChain.push(afterCreate      || emptyHook);
  
      // todo: check if validations is a Promise
      hookChain.reduce((prevPromise, currPromise) => prevPromise
        .then(_fields => currPromise(_fields, fieldName)), Promise.resolve(fields))
        .then(record => resolve(record))
        .catch(err => reject(`PyropeModel#create() > ${err}`));
    });
  }
  
  /**
   * Update a record
   *
   * To set or unset child/children, pass in the fields the setContact/setContacts/unsetContact/unsetContacts argument.
   *
   * It will look in the schema for fields that are a scalar Object Type or GraphQLList with the given name.
   *
   * You should use these arguments in your GraphQL query.
   *
   * * **setRecord** accepts a scalar value of the uuid and calls this.setChild()
   * * **setRecords** accepts an array of uuids and calls this.setChildren()
   * * **unsetRecord** accepts an empty string and calls this.unsetChild()
   * * **unsetRecords** accepts an array and null for the uuid and calls this.unsetChildren()
   * * (!) When empty is passed, **all** the records are dissociated.
   *
   * _Record_ being the name of the associated field.
   *
   * @example
   *
   *  mutation {
   *    updateUser(
   *      uuid: "123"
   *      setContact: "contact-uuid"
   *    ) {
   *      uuid
   *      contact {
   *        uuid
   *      }
   *    }
   *  }
   *
   * @example
   *
   *  mutation {
   *    updateUser(
   *      uuid: "123"
   *      setContacts: ["contact-uuid-1", "contact-uuid-2"]
   *    ) {
   *      uuid
   *      contact {
   *        uuid
   *      }
   *    }
   *  }
   *
   *  @example
   *
   *  mutation {
   *    updateUser(
   *      uuid: "123"
   *      unsetContact: ""
   *    ) {
   *      uuid
   *      contact {
   *        uuid
   *      }
   *    }
   *  }
   *
   *  @example
   *
   *  mutation {
   *    updateUser(
   *      uuid: "123"
   *      unsetContacts: ["contact-uuid-1", "contact-uuid-2"]
   *    ) {
   *      uuid
   *      contact {
   *        uuid
   *      }
   *    }
   *  }
   *
   *  @example
   *
   *  mutation {
   *    updateUser(
   *      uuid: "123"
   *      unsetContacts: ""
   *    ) {
   *      uuid
   *      contact {
   *        uuid
   *      }
   *    }
   *  }
   *
   * @param {object} index - The index used to query the record.
   * @param {any} index.key - The index key used to query the record.
   * @param {any} index.value - The index value used to query the record.
   * @param {object} fields - The map to the fields to update.
   * @param {object} opts - Options object.
   * @param {function(fields: object, fieldName: string): object} opts.beforeValidation - beforeValidation hook, should return the [modified] fields.
   * @param {function(fields: object, fieldName: string): object} opts.afterValidation - afterValidation hook, should return the [modified] fields.
   * @param {function(fields: object, fieldName: string): object} opts.beforeUpdate - beforeUpdate hook, should return the [modified] fields.
   * @param {function(fields: object, fieldName: string): object} opts.afterUpdate - afterUpdate hook, should return the [modified] fields.
   * @param {string} opts.fieldName - fieldName. Passed by the resolver function from GraphQL. ie. the name of the Query or Mutation.
   * @returns {Promise<object|boolean>} - A promise tha resolves to the updated record fields. Promise resolves to false if the record does not exist.
   */
  update(index, fields = {}, opts = {}) {
    return new Promise((resolve, reject) => {
      if(!index || !isObject(index)) return reject(`PyropeModel#update(): 'index' is undefined or not an object.`);
      if(fields && !isObject(fields)) return reject(`PyropeModel#update(): 'fields' is not an object.`);
  
      const {
        beforeValidation,
        afterValidation,
        beforeUpdate,
        afterUpdate,
        fieldName
      } = opts;
      
      const itemIndexValue = index[Object.keys(index)[0]];
      
      let assocPromiseChain = [];
  
      const emptyHook = (fields) => new Promise((resolve, reject) => resolve(fields));
      
      const updateHook = (fields) => new Promise((res, rej) => {
        this.actions.update({
          index,
          fields
        })
          .then(record => {
            if(record === false) {
              return res(false);
            } else {
              const indexKey = Object.keys(index)[0];
              const newIndex = {
                [indexKey]: record[indexKey]
              };
        
              return res(this.get(newIndex)); // todo: optimize. Get is needed in order to retieve nested fields.
            }
          })
          .catch(err => rej(`updateHook() > ${err}`));
      });
      
      const preAssociationsHook = (fields) => {
        let fieldsToRemove = [];
        
        mapObject(fields, (val, key) => {
          let associationKey;
          let associationHasMany = false;
          
          // todo: refactor
          if(key.startsWith('set')) {
            associationKey = key.substr(3, key.length - 3).toLocaleLowerCase();
            fieldsToRemove.push(key);
            
            if(find(Object.keys(this.fields), k => k === associationKey)) {
              associationHasMany = this.fields[associationKey].hasMany;
  
              if (associationHasMany) {
                assocPromiseChain.push(this.setChildren(itemIndexValue, {[associationKey]: val}))
              } else {
                assocPromiseChain.push(this.setChild(itemIndexValue, {[associationKey]: val}))
              }
            }
          } else if(key.startsWith('unset')) {
            associationKey = key.substr(5, key.length - 5).toLocaleLowerCase();
            fieldsToRemove.push(key);

            if(find(Object.keys(this.fields), k => k === associationKey)) {
              associationHasMany = this.fields[associationKey].hasMany;

              if (associationHasMany) {
                assocPromiseChain.push(this.unsetChildren(itemIndexValue, {[associationKey]: val}))
              } else {
                assocPromiseChain.push(this.unsetChild(itemIndexValue, associationKey))
              }
            }
          }
        });
        
        return Promise.resolve(omit(fields, fieldsToRemove));
      };
      
      const postAssociationsHook = (fields) => new Promise((res, rej) => {
        Promise.all(assocPromiseChain)
          .then(() => res(fields))
          .catch(err => rej(err))
      });
      
      let hookChain = [];
  
      hookChain.push(beforeValidation || emptyHook);
      hookChain.push(this.validations || emptyHook);
      hookChain.push(afterValidation  || emptyHook);
      hookChain.push(beforeUpdate     || emptyHook);
      hookChain.push(preAssociationsHook);
      hookChain.push(updateHook);
      hookChain.push(postAssociationsHook);
      hookChain.push(afterUpdate      || emptyHook);
  
      hookChain.reduce((prevPromise, currPromise) => prevPromise
        .then(_fields => currPromise(_fields, fieldName, index)), Promise.resolve(fields))
        .then(record => resolve(record))
        .catch(err => reject(`PyropeModel#update() > ${err}`));
    });
  }
  
  /**
   * Destroys a record
   *
   * If the schema (GraphQLObjectTYpe) specifies fields with dependent = 'destroy' || 'nullify'
   * the associated records will be either destroyed or dissociated (nullified)
   *
   * @param {object} index - The index used to query the record.
   * @param {any} index.key - The index key used to query the record.
   * @param {any} index.value - The index value used to query the record.
   * @param {object} opts - Options object.
   * @param {function(fields: object, fieldName: string): object} opts.beforeValidation - beforeValidation hook, should return the [modified] fields.
   * @param {function(fields: object, fieldName: string): object} opts.afterValidation - afterValidation hook, should return the [modified] fields.
   * @param {function(fields: object, fieldName: string): object} opts.beforeDestroy - beforeDestroy hook, should return the [modified] fields.
   * @param {function(fields: object, fieldName: string): object} opts.afterDestroy - afterDestroy hook, should return the [modified] fields.
   * @param {string} opts.fieldName - fieldName. Passed by the resolver function from GraphQL. ie. the name of the Query or Mutation.
   * @returns {Promise<object|boolean>} - The object of the destroyed record. False if the record was not found.
   */
  destroy(index, opts = {}) {
    return new Promise((resolve, reject) => {
      if(!index || !isObject(index)) return reject(`PyropeModel#destroy(): 'index' is undefined or not an object.`);
    
      const {
        beforeValidation,
        afterValidation,
        beforeDestroy,
        afterDestroy,
        fieldName
      } = opts;
      
      const emptyHook = (fields) => new Promise((resolve, reject) => resolve(fields));
      
      const deleteHook = (fields) => new Promise((res, rej) => {
        this.actions.destroy({
          index
        })
          .then(record => {
            if(record === false) {
              return res(false);
            } else {
              return res(record)
            }
          })
          .catch(err => rej(`destroyHook() > ${err}`));
      });
      
      const updateAssociationsHook = (fields) => new Promise((resolve, reject) => {
        let destroyAssocKeys = (filter(this.fields, f => f.dependent === 'destroy'));
        let nullifyAssocKeys = (filter(this.fields, f => f.dependent === 'nullify' || f.dependent === 'destroy')); // todo: watch behavior

        const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
        const parentIndexValue = index[Object.keys(index)[0]];
  
        destroyAssocKeys = destroyAssocKeys.map(i => {
          if(i.type.ofType) {
            return Inflector.underscore(Inflector.singularize(i.type.ofType.name));
          } else {
            return Inflector.underscore(Inflector.singularize(i.type.name));
          }
        });
        
        nullifyAssocKeys = nullifyAssocKeys.map(i => {
          if(i.type.ofType) {
            return Inflector.underscore(Inflector.singularize(i.type.ofType.name));
          } else {
            return Inflector.underscore(Inflector.singularize(i.type.name));
          }
        });
        
        const destroyPromise = () => new Promise((res, rej) => {
          destroyAssocKeys.reduce((prevPromise, currKey, index, arr) =>
            prevPromise.then(() => {
              const associationTableName = buildAssociationTableName(this.tableName, currKey);
              const associationActions = new PyropeActions({tablePrefix: this.tablePrefix, tableName: associationTableName, tableSuffix: this.tableSuffix});
              
              return associationActions.getAssociations({
                items: [
                  {index: {[parentIndexKey]: parentIndexValue}},
                  {index: currKey}
                ]
              })
                .then((assoc) => {
                  if(assoc.length > 0) {
            
                    return assoc.reduce((prevPromise, currAssoc, index, arr) =>
                        prevPromise.then(() => {
                          // todo: refactor with batchWrite ?
                          const destroyAction = new PyropeActions({tablePrefix: this.tablePrefix, tableName: Inflector.tableize(currKey), tableSuffix: this.tableSuffix});
                          
                          return destroyAction.destroy({
                            index: {uuid: currAssoc}
                          })
                        })
              
                      , Promise.resolve());
                  } else {
                    return Promise.resolve();
                  }
                })
                .catch(err => Promise.reject(err));
            })
          , Promise.resolve())
            .then(() => res())
            .catch(err => rej(err));
        });
        
        const nullifyPromise = () => new Promise((res, rej) => {
          nullifyAssocKeys.reduce((prevPromise, currKey, index, arr) =>
            prevPromise.then(() => this.unsetChildren(parentIndexValue, {[currKey]: null})
              .then(() => Promise.resolve())
              .catch(err => Promise.reject(err)))
          , Promise.resolve())
            .then(() => res())
            .catch(err => rej(err));
        });
        
        let promiseArray = [];
        
        if(destroyAssocKeys.length > 0) promiseArray.push(destroyPromise);
        if(nullifyAssocKeys.length > 0) promiseArray.push(nullifyPromise);
        
        promiseArray.reduce((prevPromise, currPromise) => prevPromise
          .then(res => currPromise()), Promise.resolve())
          .then(res => resolve(fields))
          .catch(err => reject(err));
      });
    
      let hookChain = [];
    
      hookChain.push(beforeValidation || emptyHook);
      hookChain.push(this.validations || emptyHook);
      hookChain.push(afterValidation  || emptyHook);
      hookChain.push(beforeDestroy    || emptyHook);
      hookChain.push(deleteHook);
      hookChain.push(updateAssociationsHook);
      hookChain.push(afterDestroy     || emptyHook);
    
      hookChain.reduce((prevPromise, currPromise) => prevPromise
        .then(_fields => currPromise(_fields, fieldName, index)), Promise.resolve(this.get(index)))
        .then(record => resolve(record))
        .catch(err => reject(`PyropeModel#destroy() > ${err}`));
    });
  }
  
  /**
   * Retrieves the record count given the Model's table
   *
   * @returns {Promise<number>} The record count.
   */
  count() {
    return new Promise((resolve, reject) => {
      this.actions.count()
        .then(count => resolve(count))
        .catch(err => reject(`PyropeModel#count() > ${err}`));
    })
  }
  
  /**
   * Get a child (1:1)
   *
   * @param {any} uuid - The index value to query the parent.
   * @param {string} childIndexKey - The index key used to query the child.
   * @param {function(source: object): any} childResolver - Resolver function.
   * @returns {Promise<object|null>} - An object with the record's fields, null if not found.
   */
  getChild(uuid, childIndexKey, childResolver) {
    return new Promise((resolve, reject) => {
      if(!uuid || !isString(uuid)) return reject(`PyropeModel#getChild(): 'uuid' is undefined or not a string.`);
      if(!childIndexKey || !isString(childIndexKey)) return reject(`PyropeModel#getChild(): 'childIndexKey' is undefined or not a string.`);
      if(!isFunction(childResolver)) return reject(`PyropeModel#getChild(): 'childResolver' is not a function.`);
  
      const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
      childIndexKey = Inflector.underscore(Inflector.singularize(childIndexKey));
      
      const tableName = buildAssociationTableName(this.tableName, childIndexKey);
      const associationActions = new PyropeActions({tablePrefix: this.tablePrefix, tableName, tableSuffix: this.tableSuffix});
  
      associationActions.getAssociations({
        items: [
          {index: {[parentIndexKey]: uuid}},
          {index: childIndexKey}
        ]
      })
        .then(associations => {
          if(associations.length > 1) {
            reject(`PyropeModel#getChild(): Expected only one association.`);
          } else if(associations.length === 0) {
            resolve(null);
          } else {
            return childResolver({uuid: associations[0]})
          }
        })
        .then(record => resolve(record))
        .catch(err => reject(`PyropeModel#getChild() > ${err}`))
    });
  }
  
  /**
   * Associates a child (1:1)
   *
   * @param {string} uuid - The index value to query the parent.
   * @param {object} childIndex - The index of the child to associate.
   * @param {string} childIndex.key - The index key of the child to associate.
   * @param {string} childIndex.value - The index value of the child to associate.
   * @returns {Promise<boolean>} - True if the association was made, false otherwise.
   */
  setChild(uuid, childIndex) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#setChild(): 'uuid' is undefined.`);
      if(!childIndex || !isObject(childIndex)) return reject(`PyropeModel#setChild(): 'index' is undefined or not an object.`);
      if(Object.keys(childIndex).length > 1) return reject(`PyropeModel#setChild(): 'index' should have only one key-value pair.`);
  
      const childIndexKey = Inflector.underscore(Inflector.singularize(Object.keys(childIndex)[0]));
      
      let items;
      
      try {
        items = buildItemIndices(uuid, childIndex, this.name, this.fields);
      } catch(err) {
        return reject(`PyropeModel#setChild() > ${err}`);
      }
  
      const tableName = buildAssociationTableName(this.tableName, childIndexKey);
      const associationActions = new PyropeActions({tablePrefix: this.tablePrefix, tableName, tableSuffix: this.tableSuffix});
  
      associationActions.associate({items})
        .then(() => resolve(true))
        .catch(err => reject(`PyropeModel#setChild() > ${err}`))
    });
  }
  
  /**
   * Dissociates a child (1:1)
   *
   * @param {any} uuid - The index value to query the parent.
   * @param {string} childIndexKey - The index key used to query the child.
   * @returns {Promise<boolean>} - True if successful, false otherwise.
   */
  unsetChild(uuid, childIndexKey) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#unsetChild(): 'uuid' is undefined.`);
      if(!childIndexKey || !isString(childIndexKey)) return reject(`PyropeModel#getChild(): 'childIndexKey' is undefined or not a string.`);
    
      // todo: check if singularization affects the lookup of the Schema's field name when its singular
      childIndexKey = Inflector.underscore(Inflector.singularize(childIndexKey));
  
      const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
      const parentIndexValue = uuid;
  
      const tableName = buildAssociationTableName(this.tableName, childIndexKey);
      const associationActions = new PyropeActions({tablePrefix: this.tablePrefix, tableName, tableSuffix: this.tableSuffix})
  
      associationActions.getAssociations({
        items: [
          {index: {[parentIndexKey]: parentIndexValue}},
          {index: childIndexKey}
        ]
      })
        .then(associations => {
          if(associations.length > 1) {
            reject(`PyropeModel#unsetChild(): Expected only one association.`);
          } else if(associations.length === 0) {
            return Promise.resolve(true);
          } else {
            return Promise.resolve(associations[0]);
          }
        })
        .then(assoc => {
          if(assoc === true) {
            return Promise.resolve(assoc);
          } else {
            return associationActions.dissociate({
              items: [
                {index: {[parentIndexKey]: parentIndexValue}},
                {index: {[childIndexKey]: assoc}}
              ]
            })
          }
        })
        .then((res) => resolve(res))
        .catch(err => reject(`PyropeModel#unsetChild() > ${err}`))
    });
  };
  
  /**
   * Gets the associated children (1:N, N:N)
   *
   * @param {any} uuid - The index value to query the parent item.
   * @param {string} childIndexKey - The index key used to query the children.
   * @param {function(source: object): any} childResolver - Resolver function.
   * @returns {Promise<array>} - An array with the associated records.
   */
  getChildren(uuid, childIndexKey, childResolver) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#getChildren(): 'uuid' is undefined.`);
      if(!childIndexKey || !isString(childIndexKey)) return reject(`PyropeModel#getChildren(): 'childIndexKey' is undefined or not a string.`);
    
      const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
      childIndexKey = Inflector.underscore(Inflector.singularize(childIndexKey));
      
      const tableName = buildAssociationTableName(this.tableName, childIndexKey);
      const associationActions = new PyropeActions({tablePrefix: this.tablePrefix, tableName, tableSuffix: this.tableSuffix});
  
      associationActions.getAssociations({
        items: [
          {index: {[parentIndexKey]: uuid}},
          {index: childIndexKey}
        ]
      })
        .then(associations => {
          if(associations.length === 0) {
            resolve([]);
          } else {
            let children = [];

            // todo: optimize reduction
            resolve(associations.reduce((prevPromise, uuid, index) =>
                prevPromise.then(res => {
                  if(res) children.push(res);

                  // todo: check for promise
                  return childResolver({uuid}).then((res) => {
                    if(index === associations.length-1) {
                      children.push(res);
                      return Promise.resolve(children)
                    } else {
                      return Promise.resolve(res);
                    }
                  });
                })
              , Promise.resolve()));
          }
        })
        .catch(err => reject(`PyropeModel#getChildren() > ${err}`))
    });
  }
  
  /**
   * Associates the specified children (1:N, N:N)
   *
   * @param {string} uuid - The index value to query the parent item.
   * @param {object} childIndex - The index of the children to associate.
   * @param {string} childIndex.key - The index key of the children to associate.
   * @param {string[]|string} childIndex.value - The index value[s] of the children to associate. Can be an array of uuids.
   * @returns {Promise<boolean>} - True if the association was made, false otherwise.
   */
  setChildren(uuid, childIndex) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#setChildren(): 'uuid' is undefined.`);
      if(!childIndex || !isObject(childIndex)) return reject(`PyropeModel#setChildren(): 'index' is undefined or not an object.`);
      if(Object.keys(childIndex).length > 1) return reject(`PyropeModel#setChildren(): 'index' should have only one key-value pair.`);
  
      const childIndexKey = Inflector.underscore(Inflector.singularize(Object.keys(childIndex)[0]));
      
      const tableName = buildAssociationTableName(this.tableName, childIndexKey);
      const associationActions = new PyropeActions({tablePrefix: this.tablePrefix, tableName, tableSuffix: this.tableSuffix});
      
      let items;
      
      try {
        items = buildItemIndices(uuid, childIndex, this.name, this.fields);
      } catch(err) {
        return reject(`PyropeModel#setChildren() > ${err}`);
      }
      
      associationActions.associate({
        items
      })
        .then(res => resolve(res))
        .catch(err => reject(`PyropeModel#setChildren() > ${err}`))
    });
  }
  
  /**
   * Dissociates children (1:N, N:N)
   *
   * @param {any} uuid - The index value to query the parent item.
   * @param {object} childIndex - The index used to query the children to dissociate. If empty is passed, all children are dissociated.
   * @param {string} childIndex.key - The index key used to query the children to dissociate. If empty is passed, all children are dissociated.
   * @param {<array<string>>|string|empty} childIndex.value - The index value used to query the children to dissociate. If empty is passed, all children are dissociated.
   * @returns {Promise<boolean>} - True if successful, false otherwise.
   */
  unsetChildren(uuid, childIndex) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#unsetChildren(): 'uuid' is undefined.`);
      if(!childIndex || !isObject(childIndex)) return reject(`PyropeModel#unsetChildren(): 'index' is undefined or not an object.`);
      if(Object.keys(childIndex).length > 1) return reject(`PyropeModel#unsetChildren(): 'index' should have only one key-value pair.`);
    
      // todo: check if singularization affects the lookup of the Schema's field name when it's singular
      const childIndexValue = childIndex[Object.keys(childIndex)[0]];
      const childIndexKey = Inflector.underscore(Inflector.singularize(Object.keys(childIndex)[0]));
    
      const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
      const parentIndexValue = uuid;
      
      const tableName = buildAssociationTableName(this.tableName, childIndexKey);
      const associationActions = new PyropeActions({tablePrefix: this.tablePrefix, tableName, tableSuffix: this.tableSuffix});
      
      associationActions.dissociate({
        items: [
          {index: {[parentIndexKey]: parentIndexValue}},
          {index: {[childIndexKey]: childIndexValue}}
        ]
      })
        .then(res => resolve(res))
        .catch(err => reject(`PyropeModel#unsetChildren() > ${err}`))
    });
  }
}