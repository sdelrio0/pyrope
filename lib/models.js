import * as pyrope from './index';
import { isArray, isObject, sortBy, find } from 'underscore';
import Inflector from 'inflected';

/**
 * Pyrope Model ORM
 *
 * @param {GraphQLObjectType} schema The GraphQL object type
 */
export class PyropeModel {
  static name;
  static humanName;
  static fields;
  static table;
  static validations;
  static defaultIndexKey;
  
  constructor(schema, opts = {}) {
    if(!schema.name) throw new Error('PyropeModel: schema.name is undefined.');
    if(!schema._typeConfig.fields) throw new Error('PyropeModel: schema.fields is undefined.');
    
    this.name = opts.name || schema.name;
    this.humanName = opts.humanName || Inflector.humanize(this.name);
    this.table = opts.table || Inflector.tableize(schema.name);
    this.fields = schema._typeConfig.fields();
    this.defaultIndexKey = opts.defaultIndexKey || 'uuid';
    this.validations = opts.validations;
  }
  
  /**
   * Retrieves a record given an index
   *
   * @param {{key: string, value: string}} index - The index used to find the record.
   *
   *
   */
  get(index) {
    return new Promise((resolve, reject) => {
      if(!index || !isObject(index)) return reject(`PyropeModel#get(): 'index' is undefined or not an object.`)
      
      pyrope.findByIndex({
        tableName: this.table,
        index
      })
        .then(records => {
          if(records === false) {
            reject(`${this.humanName} not found.`);
          } else if(isArray(records) && records.length > 1) {
            reject('PyropeModel.get(): More than one item with the specified index were found.');
          } else {
            resolve(records[0])
          }
        })
        .catch(err => reject(`PyropeModel#get() > ${err}`));
    });
  }
  
  /**
   *
   * @param opts
   * @returns {Promise}
   */
  getAll(opts = {}) {
    return new Promise((resolve, reject) => {
      const optsAll = {
        ascending: (opts.order && opts.order === 'asc' ? true : (opts.order && opts.order === 'desc' ? false : true)),
        limit: (opts.limit || 0),
        cursor: (opts.cursor || undefined),
      };
  
      pyrope.all({
        tableName: this.table,
        ...optsAll
      })
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
   * Create a record
   *
   *
   *
   * @param opts
   * @returns {Promise}
   */
  create(fields = {}, opts = {}) {
    return new Promise((resolve, reject) => {
      if(!fields || !isObject(fields)) return reject(`PyropeModel#create(): 'fields' is undefined or not an object.`);
      
      const {
        beforeValidation,
        afterValidation,
        beforeCreate,
        afterCreate,
        fieldName
      } = opts;
      
      const emptyHook = (fields) => new Promise((resolve, reject) => resolve(fields));
      const createHook = (fields, fieldName) => new Promise((res, rej) => {
        pyrope.findByIndex({
          tableName: this.table,
          index: {[this.defaultIndexKey]: fields[this.defaultIndexKey]}
        })
          .then(exists => {
            if(exists !== false) {
              return reject(`${this.humanName} already exists.`);
            }
          })
          .then(() => pyrope.create({
            tableName: this.table,
            attributes: fields
          }))
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
  
      hookChain.reduce((prevPromise, currPromise) => prevPromise
        .then(res => currPromise(res, fieldName)), Promise.resolve(fields))
        .then(res => resolve(res))
        .catch(err => reject(`PyropeModel#create() > ${err}`));
    });
  }
  
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
  
      const emptyHook = (fields) => new Promise((resolve, reject) => resolve(fields));
      const updateHook = (fields) => new Promise((res, rej) => {
        pyrope.update({
          tableName: this.table,
          index,
          attributes: fields
        })
          .then(record => {
            if(record === false) {
              return rej(`${this.humanName} not found.`);
            } else {
              const indexKey = Object.keys(index)[0];
              const newIndex = {
                [indexKey]: record[indexKey]
              };
        
              return res(this.get(newIndex))
            }
          })
          .catch(err => reject(`updateHook() > ${err}`));
      });
      
      let hookChain = [];
  
      hookChain.push(beforeValidation || emptyHook);
      hookChain.push(this.validations || emptyHook);
      hookChain.push(afterValidation  || emptyHook);
      hookChain.push(beforeUpdate     || emptyHook);
      hookChain.push(updateHook);
      hookChain.push(afterUpdate      || emptyHook);
  
      hookChain.reduce((prevPromise, currPromise) => prevPromise
        .then(res => currPromise(res, fieldName, index)), Promise.resolve(fields))
        .then(res => resolve(res))
        .catch(err => reject(`PyropeModel#update() > ${err}`));
    });
  }
  
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
        pyrope.destroy({
          tableName: this.table,
          index
        })
          .then(record => {
            if(record === false) {
              return rej(`${this.humanName} not found.`);
            } else {
              return res(record)
            }
          })
          .catch(err => reject(`destroyHook() > ${err}`));
      });
    
      let hookChain = [];
    
      hookChain.push(beforeValidation || emptyHook);
      hookChain.push(this.validations || emptyHook);
      hookChain.push(afterValidation  || emptyHook);
      hookChain.push(beforeDestroy    || emptyHook);
      hookChain.push(deleteHook);
      hookChain.push(afterDestroy     || emptyHook);
    
      hookChain.reduce((prevPromise, currPromise) => prevPromise
        .then(res => currPromise(res, fieldName, index)), Promise.resolve(this.get(index)))
        .then(res => resolve(res))
        .catch(err => reject(`PyropeModel#destroy() > ${err}`));
    });
  }
  
  getChild(uuid, childIndexKey, resolver, opts = {}) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#getChild(): 'uuid' is undefined.`);
      if(!childIndexKey || !isString(childIndexKey)) return reject(`PyropeModel#getChild(): 'childIndexKey' is undefined or not a string.`);
  
      const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
      const childIndexKey = Inflector.underscore(Inflector.singularize(childIndexKey));
      const tableName = opts.table || this.buildAssociationTableName(childIndexKey);
      
      pyrope.getAssociations({
        tableName: tableName,
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
            resolve(resolver({uuid: associations[0]}));
          }
        })
        .catch(err => reject(`PyropeModel#getChild() > ${err}`))
    });
  }
  
  buildItemIndices(uuid, childIndex) {
    if(!uuid) throw new Error(`'uuid' is undefined.`);
    if(!childIndex || !isObject(childIndex)) throw new Error(`'index' is undefined or not an object.`);
    if(Object.keys(childIndex).length > 1) throw new Error(`'index' should have only one key-value pair.`);
  
    const childIndexKey = Inflector.underscore(Inflector.singularize(Object.keys(childIndex)[0]));
    // const childIndexValue = childIndex[childIndexKey];
    const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
    const parentIndexValue = uuid;
  
    if(!Object.keys(this.fields).find(f => f === childIndexKey)) throw new Error(`'${childIndexKey}' is not a field of '${this.name}'.`);
    if(!this.fields[childIndexKey].type) throw new Error(`'${childIndexKey}' is missing type.`);
    if(!this.fields[childIndexKey].type._typeConfig) throw new Error(`'${childIndexKey}.type' is missing _typeConfig.`);
    if(!this.fields[childIndexKey].type._typeConfig.fields) throw new Error(`'${childIndexKey}' is missing fields.`);
    if(!(Object.keys(this.fields[childIndexKey].type._typeConfig.fields()).find(f => f === parentIndexKey ))) throw new Error(`'${childIndexKey}' is missing field '${parentIndexKey}'.`);
  
  
    const childFields = this.fields[childIndexKey].type._typeConfig.fields();
    const parentFields = this.fields;
    const childHasManyParents = childFields[parentIndexKey].hasMany || false;
    const parentHasManyChildren = parentFields[childIndexKey].hasMany || false;
  
    const parentIndex = {[parentIndexKey]: parentIndexValue};
    
    return [
      {
        index: parentIndex,
        hasMany: parentHasManyChildren,
      },
      {
        index: childIndex,
        childHasManyParents
      }
    ];
  }
  
  buildAssociationTableName(associationKey) {
    return sortBy([this.name, associationKey].map(t => Inflector.tableize(t)), t => t).join('_');
  }
  
  setChild(uuid, childIndex, opts = {}) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#setChild(): 'uuid' is undefined.`);
      if(!childIndex || !isObject(childIndex)) return reject(`PyropeModel#setChild(): 'index' is undefined or not an object.`);
      if(Object.keys(childIndex).length > 1) return reject(`PyropeModel#setChild(): 'index' should have only one key-value pair.`);
  
      const childIndexKey = Inflector.underscore(Inflector.singularize(Object.keys(childIndex)[0]));
      
      let items;
      
      try {
        items = this.buildItemIndices(uuid, childIndex);
      } catch(err) {
        return reject(`PyropeModel#setChild() > ${err}`);
      }
      
      const tableName = opts.table || this.buildAssociationTableName(childIndexKey);
      
      pyrope.associate({tableName, items})
        .then(() => resolve(true))
        .catch(err => reject(`PyropeModel#setChild() > ${err}`))
    });
  }
  
  unsetChild() {
    
  }
  
  getChildren() {
    
  }
  
  setChildren() {
    
  }
  
  unsetChildren() {
    
  }
}