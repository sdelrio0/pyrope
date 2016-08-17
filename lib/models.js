import * as pyrope from './index';
import { isArray, isObject, sortBy, find, isString } from 'underscore';
import Inflector from 'inflected';

const DEBUG = false;

const log = (msg, json) => {if(DEBUG) {console.log(`----------------------------\n${msg}${json ? JSON.stringify(json, null, 2) : ''}\n`)}};

/**
 * Pyrope Model ORM
 *
 */
export default class PyropeModel {
  static name;
  static humanName;
  static fields;
  static table;
  static validations;
  static defaultQueryKey;
  
  /**
   * PyropeModel#constructor
   *
   * @param {GraphQLObjectType} schema - The model schema.
   * @param {object} opts - The options object.
   * @param {string} opts.name - Custom name.
   * @param {string} opts.humanName - Custom human name (for errors).
   * @param {string} opts.table - Custom table to query from.
   * @param {string} opts.defaultQueryKey - Custom default query key.
   * @param {function(fields: object, fieldName: string)} opts.validations - Validation function.
   */
  constructor(schema, opts = {}) {
    if(!schema) throw new Error(`PyropeModel#constructor(): 'schema' is undefined.`);
    if(!schema.name) throw new Error('PyropeModel#constructor(): schema.name is undefined.');
    if(!schema._typeConfig.fields) throw new Error('PyropeModel#constructor(): schema.fields is undefined.');
    
    this.name = opts.name || schema.name;
    this.humanName = opts.humanName || Inflector.humanize(this.name);
    this.table = opts.table || Inflector.tableize(schema.name);
    this.fields = schema._typeConfig.fields();
    this.defaultQueryKey = opts.defaultQueryKey || 'uuid';
    this.validations = opts.validations;
  }
  
  /**
   * Retrieve a record given an index
   *
   * @param {object} index - The index used to find the record.
   * @param {string} index.key - The index key used to query the record.
   * @param {string} index.value - The index value used to query the record.
   * @returns {Promise<Map, Promise.reject>} - The retrieved record map. Rejects if record is not found.
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
   * Get all records
   *
   * @param {object} opts - Options object.
   * @param {string} opts.ascending - Options object.
   * @param {number} opts.limit - The amount of records to retrieve.
   * @param {string} opts.cursor - The cursor from which the query continues.
   * @returns {Promise<Array>} - An array with the maps of the retrieved objects. Empty array if none is found.
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
   *
   * @param fields
   * @param opts
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
          index: {[this.defaultQueryKey]: fields[this.defaultQueryKey]}
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
  
  /**
   *
   * @param index
   * @param fields
   * @param opts
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
  
  /**
   *
   * @param index
   * @param opts
   * @returns {Promise}
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
  
  /**
   * Get a child (1:1)
   *
   * @param {string} uuid - The index value to query the parent.
   * @param {string} childIndexKey - The index key used to query the child.
   * @param {function(source: object)} childResolver - Resolver function.
   * @param {object} opts - The options object.
   * @param {string} opts.table - Custom association table to query from.
   * @returns {Promise<Map, null>} - null if not found
   */
  getChild(uuid, childIndexKey, childResolver, opts = {}) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#getChild(): 'uuid' is undefined.`);
      if(!childIndexKey || !isString(childIndexKey)) return reject(`PyropeModel#getChild(): 'childIndexKey' is undefined or not a string.`);
  
      const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
      childIndexKey = Inflector.underscore(Inflector.singularize(childIndexKey));
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
            return childResolver({uuid: associations[0]})
          }
        })
        .then(record => resolve(record))
        .catch(err => reject(`PyropeModel#getChild() > ${err}`))
    });
  }
  
  /**
   *
   * @param uuid
   * @param childIndex
   * @param opts
   * @returns {Promise}
   */
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
  
  /**
   *
   * @param uuid
   * @param childIndexKey
   * @param opts
   * @returns {Promise} -
   */
  unsetChild(uuid, childIndexKey, opts = {}) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#unsetChild(): 'uuid' is undefined.`);
      if(!childIndexKey || !isString(childIndexKey)) return reject(`PyropeModel#getChild(): 'childIndexKey' is undefined or not a string.`);
    
      // todo: check if singularization affects the lookup of the Schema's field name when its singular
      childIndexKey = Inflector.underscore(Inflector.singularize(childIndexKey));
  
      const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
      const parentIndexValue = uuid;
      const tableName = opts.table || this.buildAssociationTableName(childIndexKey);
      
      
      pyrope.getAssociations({
        tableName: tableName,
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
            return pyrope.dissociate({
              tableName: tableName,
              items: [
                {index: {[parentIndexKey]: parentIndexValue}},
                {index: {[childIndexKey]: assoc}}
              ]
            })
          }
        })
        .then((res) => resolve(res))
        .catch(err => reject(`PyropeModel#unsetChild(): ${err}`))
    });
  };
  
  getChildren(uuid, childIndexKey, childResolver, opts = {}) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#getChildren(): 'uuid' is undefined.`);
      if(!childIndexKey || !isString(childIndexKey)) return reject(`PyropeModel#getChildren(): 'childIndexKey' is undefined or not a string.`);
    
      const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
      childIndexKey = Inflector.underscore(Inflector.singularize(childIndexKey));
      const tableName = opts.table || this.buildAssociationTableName(childIndexKey);
      
      pyrope.getAssociations({
        tableName,
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
  
  setChildren(uuid, childIndex, opts = {}) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#setChildren(): 'uuid' is undefined.`);
      if(!childIndex || !isObject(childIndex)) return reject(`PyropeModel#setChildren(): 'index' is undefined or not an object.`);
      if(Object.keys(childIndex).length > 1) return reject(`PyropeModel#setChildren(): 'index' should have only one key-value pair.`);
  
      const childIndexKey = Inflector.underscore(Inflector.singularize(Object.keys(childIndex)[0]));
      const tableName = opts.table || this.buildAssociationTableName(childIndexKey);
      let items;
      
      // console.log(`===================`);
      // console.log(`setChildren()`);
      // console.log(`uuid: ${uuid}`);
      // console.log(`childIndex: `, childIndex);
   
      try {
        items = this.buildItemIndices(uuid, childIndex);
      } catch(err) {
        return reject(`PyropeModel#setChildren() > ${err}`);
      }
      
      log(`items = `, items);
      
      pyrope.associate({
        tableName,
        items
      })
        .then(res => resolve(res))
        .catch(err => reject(`PyropeModel#setChildren() > ${err}`))
    });
    
    
  }
  
  unsetChildren(uuid, childIndex, opts = {}) {
    return new Promise((resolve, reject) => {
      if(!uuid) return reject(`PyropeModel#unsetChildren(): 'uuid' is undefined.`);
      if(!childIndex || !isObject(childIndex)) return reject(`PyropeModel#unsetChildren(): 'index' is undefined or not an object.`);
      if(Object.keys(childIndex).length > 1) return reject(`PyropeModel#unsetChildren(): 'index' should have only one key-value pair.`);
    
      // todo: check if singularization affects the lookup of the Schema's field name when its singular
      const childIndexValue = childIndex[Object.keys(childIndex)[0]];
      const childIndexKey = Inflector.underscore(Inflector.singularize(Object.keys(childIndex)[0]));
    
      const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
      const parentIndexValue = uuid;
      const tableName = opts.table || this.buildAssociationTableName(childIndexKey);
  
      pyrope.dissociate({
        tableName,
        items: [
          {index: {[parentIndexKey]: parentIndexValue}},
          {index: {[childIndexKey]: childIndexValue}}
        ]
      })
        .then(res => resolve(res))
        .catch(err => reject(`PyropeModel#unsetChildren() > ${err}`))
    });
  }
  
  buildItemIndices(uuid, childIndex) {
    if(!uuid) throw new Error(`'uuid' is undefined.`);
    if(!childIndex || !isObject(childIndex)) throw new Error(`'index' is undefined or not an object.`);
    if(Object.keys(childIndex).length > 1) throw new Error(`'index' should have only one key-value pair.`);
    
    let childFieldKey = Object.keys(childIndex)[0];
    let parentFieldKey = Inflector.underscore(Inflector.singularize(this.name));
    
    const childIndexKey = Inflector.underscore(Inflector.singularize(Object.keys(childIndex)[0]));
    const childIndexValue = childIndex[childFieldKey];
    
    const parentIndexKey = Inflector.underscore(Inflector.singularize(this.name));
    const parentIndexValue = uuid;
    
    log(`parentIndexKey: ${parentIndexKey}`);
    log(`parentIndexValue: ${parentIndexValue}`);
    log(`childFieldKey: ${childFieldKey}`);
    log(`childIndexKey: ${childIndexKey}`);
    log(`childIndexValue: ${childIndexValue}`);
    //log(`${this.name}.fields`, this.fields);
     
    // In case the field is plural
    if(!Object.keys(this.fields).find(f => f === childFieldKey)) {
      childFieldKey = Inflector.pluralize(childFieldKey);
      
      if(!Object.keys(this.fields).find(f => f === childFieldKey)) throw new Error(`'${childFieldKey}' is not a field of '${this.name}'.`);
    }
  
    //log(`${this.name}.fields[${childFieldKey}]`, this.fields[childFieldKey].type.ofType._typeConfig.fields());
    
    if(!this.fields[childFieldKey].type) throw new Error(`'${childFieldKey}' is missing 'type'.`);
    
    let childFields;
    
    // If its a GraphQLList:
    if(this.fields[childFieldKey].type.ofType) {
      if(!this.fields[childFieldKey].type.ofType._typeConfig) throw new Error(`'${childFieldKey}.type.ofType' is missing '_typeConfig'.`);
      if(!this.fields[childFieldKey].type.ofType._typeConfig.fields) throw new Error(`'${childFieldKey}' is missing 'fields'.`);
      
      // In case the field is plural
      if(!(Object.keys(this.fields[childFieldKey].type.ofType._typeConfig.fields()).find(f => f === parentFieldKey ))) {
        parentFieldKey = Inflector.pluralize(parentFieldKey);
        
        if(!(Object.keys(this.fields[childFieldKey].type.ofType._typeConfig.fields()).find(f => f === parentFieldKey ))) throw new Error(`'${childFieldKey}' is missing association with field '${parentFieldKey}'.`);
      }
      
      childFields = this.fields[childFieldKey].type.ofType._typeConfig.fields();
    // If its a Scalar Type:
    } else {
      if(!this.fields[childFieldKey].type._typeConfig) throw new Error(`'${childFieldKey}.type' is missing '_typeConfig'.`);
      if(!this.fields[childFieldKey].type._typeConfig.fields) throw new Error(`'${childFieldKey}' is missing 'fields'.`);
  
      // In case the field is plural
      if(!(Object.keys(this.fields[childFieldKey].type._typeConfig.fields()).find(f => f === parentFieldKey ))) {
        parentFieldKey = Inflector.pluralize(parentFieldKey);
        
        if(!(Object.keys(this.fields[childFieldKey].type._typeConfig.fields()).find(f => f === parentFieldKey ))) throw new Error(`'${childFieldKey}' is missing association with field '${parentFieldKey}'.`);
      }
  
      childFields = this.fields[childFieldKey].type._typeConfig.fields();
    }
    
    const parentFields = this.fields;
    const parentHasManyChildren = parentFields[childFieldKey].hasMany || false;
    const childHasManyParents = childFields[parentFieldKey].hasMany || false;
    
    log(`parentFields: `, parentFields);
    log(`childFields: `, childFields);
    log(`parentHasManyChildren: `, parentHasManyChildren);
    log(`childHasManyParents: `, childHasManyParents);
    
    const parentIndex = {[parentIndexKey]: parentIndexValue};
    childIndex = {[childIndexKey]: childIndexValue};
  
    log(`parentIndex: `, parentIndex);
    log(`childIndex: `, childIndex);
    
    // Make sure we don't associate to a parent that hasMany = false
    if(!parentHasManyChildren && isArray(childIndex[childIndexKey]) && childIndex[childIndexKey].length > 1) throw new Error(`Cannot associate many to a model that cannot have many children.`);
    
    return [
      {
        index: parentIndex,
        hasMany: parentHasManyChildren,
      },
      {
        index: childIndex,
        hasMany: childHasManyParents
      }
    ];
  }
  
  buildAssociationTableName(associationKey) {
    return sortBy([this.name, associationKey].map(t => Inflector.tableize(t)), t => t).join('_');
  }
}