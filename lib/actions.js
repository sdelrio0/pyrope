import { ddbClient } from './core';
import { difference, intersection, isNumber, isArray, isBoolean, isString, pluck, isObject, isFunction, isEmpty } from 'underscore';
import { buildUpdateExpression, genTableDigest, iterateArrayOverPromise, buildAction } from './utils';
import { v4 } from 'uuid';

const DEBUG = false;
const log = (msg, json) => {if(DEBUG) {console.log(`${msg}\n${json ? JSON.stringify(json, null, 2) : ''}\n`)}};

export const COUNTERS_TABLE_NAME = 'table_counters';

export default class PyropeActions {
  static tablePrefix;
  static tableName;
  static tableSuffix;
  static fullTableName;
  
  /**
   * PyropeActions
   *
   * Low level DynamoDB actions.
   *
   * @param {object} opts - The options object.
   * @param {string} opts.tablePrefix - Prefix to the lookup table.
   * @param {string} opts.tableName - Table name.
   * @param {string} opts.tableSuffix - Suffix to the lookup table.
   */
  constructor(opts) {
    const { tablePrefix, tableName, tableSuffix } = opts;
    
    if(!tableName || !isString(tableName)) throw new Error(`PyropeActions#constructor(): 'tableName' is undefined or not a string.`);
    
    this.tablePrefix = tablePrefix || '';
    this.tableName = tableName;
    this.tableSuffix = tableSuffix || '';
    this.fullTableName = this.tablePrefix + this.tableName + this.tableSuffix;
  }
  
  /**
   * Returns an array with the mappings for every record in the table.
   *
   * Results are returned sorted ascending. You can specify a limit  and a cursor
   * to do batch fetching.
   *
   * ```
   * opts = {
   *  ascending: Boolean,    // Should the results be returned in a ascending manner?
   *  limit: Integer,        // The amount of items to fetch
   *  cursor: String         // A base64 encoded map of the key containing {uuid: String, createdAt: Number, _table: String}
   * }
   * ```
   *
   *
   * @param {string} opts.order - Order ('asc'|'desc')
   * @param {number} opts.limit - Limit to return.
   * @param {string} opts.cursor - Cursor.
   * @return {Promise<array>} An array with the QUERY result, has the structure {Items: [], Count: 0, Cursor: ''}
   *
   * @TODO: Select specific fields to return.
   */
  all(opts = {}) {
    return new Promise((resolve, reject) => {
      // if(opts === undefined) return reject(`PyropeActions#all() > 'opts' is not defined.`);
  
      let { order = 'asc', limit = 0, cursor = undefined } = opts;
      
      // if(tableName === undefined || !isString(tableName)) return reject(`all() > 'tableName' is undefined or not a string.`);
      if(order && !isString(order)) return reject(`PyropeActions#all() > 'order' is not a string.`);
      if(order && order !== 'asc' && order !== 'desc') return reject(`PyropeActions#all() > 'order' is neither 'asc' nor 'desc'.`);
      if(limit && !isNumber(limit)) return reject(`PyropeActions#all() > 'limit' is not a number.`);
      if(cursor && !isString(cursor)) return reject(`PyropeActions#all() > 'cursor' is not a string.`);
  
      let params = {
        TableName: this.fullTableName,
        IndexName: '_tableIndex',
        KeyConditionExpression: `#t = :t`,
        ExpressionAttributeNames: {
          '#t': '_table'
        },
        ExpressionAttributeValues: {
          ':t': this.fullTableName
        },
        ScanIndexForward: order === 'asc',
        Select: 'ALL_ATTRIBUTES'
      };
  
      if(limit && isNumber(limit) && limit > 0) {
        params = {...params, Limit: limit};
      }
  
      if(cursor) {
        let startKey;
    
        try {
          startKey = JSON.parse(new Buffer(cursor, 'base64').toString('ascii'));
        } catch(err) {
          return reject(`all() > Error parsing cursor: ${err}`);
        }
    
        params = {...params, ExclusiveStartKey: startKey};
      }
  
      ddbClient('query', params)
        .then(res => {
          if(res.LastEvaluatedKey) {
            res.Cursor = new Buffer(JSON.stringify(res.LastEvaluatedKey)).toString('base64');
          }
      
          resolve(res);
        })
        .catch(err => reject(`all() > ${err}`));
    });
  }
    
  
  take(opts = {}) {
    let { limit = 1, cursor, order = 'asc' } = opts;
    
    return this.all({limit, cursor, order});
  };
  
  first(opts = {}) {
    let { limit = 1, cursor } = opts;
    
    return this.take({limit, cursor});
  };
  
  last(opts = {}) {
    let { limit = 1, cursor } = opts;
    
    return this.take({limit, order: 'desc', cursor});
  };
  
  increaseCounter( opts ) {
    return this.updateCounter({...opts, step: 1});
  }
  
  decreaseCounter( opts ) {
    return this.updateCounter({...opts, step: -1});
  }
  
  updateCounter( opts ) {
    return new Promise((resolve, reject) => {
      const { step } = opts;
    
      // if(fullTableName === undefined) return reject(`updateCounter(): Missing 'fullTableName'`);
      if(!isNumber(step)) return reject(`PyropeActions#updateCounter(): 'step' is not a number.`);
    
      const counterTableName = this.tablePrefix + COUNTERS_TABLE_NAME  + this.tableSuffix;
      const tableDigest = genTableDigest(this.fullTableName);
    
      ddbClient('update', {
        TableName: counterTableName,
        Key: {tableDigest},
        UpdateExpression: `ADD #count :step`,
        ExpressionAttributeNames: {
          '#count': 'count'
        },
        ExpressionAttributeValues: {
          ':step': step
        },
        ReturnValues: 'ALL_NEW'
      })
        .then(res => {
          if(res.Attributes.count === undefined) {
            reject(`Error while updating counter for '${this.fullTableName}'.`);
          } else {
            resolve(res.Attributes.count);
          }
        })
        .catch(err => reject(`updateCounter(): ${err}`))
    });
  }
  
  /**
   * Returns the table's item count
   *
   * @return {Promise<number>} The item count.
   */
  count() {
    return new Promise((resolve, reject) => {
      // if(opts === undefined) return reject(`PyropeActions#count() > 'opts' is not defined.`);
      
      // if(tableName && (tableName === undefined || !isString(tableName))) return reject(`PyropeActions#count() > 'tableName' is undefined or not a string.`);
    
      const counterTableName = this.tablePrefix + COUNTERS_TABLE_NAME + this.tableSuffix;
    
      let count = 0;
    
      this.findByIndex({
        tableName: counterTableName,
        index: {tableDigest: genTableDigest(this.fullTableName)}
      })
        .then(res => {
          if(res === false) {
            resolve(0);
          } else {
            resolve(res[0].count);
          }
        })
        .catch(err => reject(`count() > ${err}`));
    });
  }
  
  /**
   * Queries a table and looks for items matching the specified index.
   *
   * The index mapping has the following structure:
   *
   * ```
   * index = {
 *   username: 'john'
 * }
   * ```
   *
   * In order to find the table's index, the word 'Index' is appended, resulting
   * in this example in 'usernameIndex'
   *
   * Every index has a 'createdAt' range key. This is calculated and
   * appended automatically before querying.
   *
   * ```
   * opts = {
 *   tableName: String,
 *   index: {hash: value, [range: value]},
 *   ascending: Boolean
 * }
   * ```
   *
   * @param {object} opts Options mapping.
   * @return {Promise<array|boolean>} Array when there are multiple matches, false when not found
   *
   */
  findByIndex(opts) {
    return new Promise((resolve, reject) => {
      if(opts === undefined) return reject(`PyropeActions#findByIndex() > 'opts' is not defined.`);
    
      let { tableName = this.fullTableName, index, order = 'asc' } = opts;
    
      // if(tableName === undefined || !isString(tableName)) return reject(`PyropeActions#findByIndex() > 'tableName' is undefined or not a string.`);
      if(index === undefined || !isObject(index)) return reject(`PyropeActions#findByIndex() > 'index' is undefined or not an object.`);
      if(Object.keys(index).length > 2) return reject(`PyropeActions#findByIndex() > 'index' should have at most 2 key-value pairs.`);
      if(Object.keys(index).length < 1) return reject(`PyropeActions#findByIndex() > 'index' should have at least 1 key-value pair.`);
      if(order && !isString(order)) return reject(`PyropeActions#findByIndex() > 'order' is not a string.`);
      if(order && order !== 'asc' && order !== 'desc') return reject(`PyropeActions#findByIndex() > 'order' is neither 'asc' nor 'desc'.`);
    
      const indexKey = Object.keys(index)[0];
      const indexValue = index[indexKey];
      const indexName = Object.keys(index)[0] + 'Index';
    
      const params = {
        TableName: tableName,
        IndexName: indexName,
        KeyConditionExpression: `#${indexKey} = :${indexKey}`,
        ExpressionAttributeNames: {
          [`#${indexKey}`]: indexKey,
        },
        ExpressionAttributeValues: {
          [`:${indexKey}`]: indexValue
        },
        ScanIndexForward: order === 'asc',
        Select: 'ALL_ATTRIBUTES'
      };
    
      ddbClient('query', params)
        .then(res => {
          if(res.Items.length === 0) {
            resolve(false); // not found
          } else {
            resolve(res.Items);
          }
        })
        .catch(err => reject(`PyropeActions#findByIndex() > ${err}`));
    });
  }
  
  
  /**
   * Creates a new record in the specified table.
   *
   * It will create the record without any conditions.
   * The following fields are auto-generated: uuid, createdAt, updatedAt
   *
   * ```
   * opts = {
 *   tableName: 'users',
 *   fields: {
 *     username: 'someguy55',
 *     password: 'myPassword123'
 *   }
 * }
   *
   * return = {
 *   uuid: '3f3e1091-8e43-41ca-a19a-881241370c31' // String = 'S'
 *   username: 'someguy55',                       // String = 'S'
 *   password: 'myPassword123'                    // String = 'S'
 *   createdAt: 1470345881706,                    // Number = 'N'
 *   updatedAt: 1470345881755                     // Number = 'N'
 * }
   * ```
   *
   * @param {object} opts Options mapping.
   * @return {object} The fields of the newly created record, rejection on error
   * @todo: Handle unprocessedItems
   * @todo: Handle failed increaseCounter()
   * @todo: let uuid, createdAt, updatedAt to be cofigurable ?
   *
   */
  create(opts) {
    return new Promise((resolve, reject) => {
      // todo: Sanitize variables (convert empty strings to null)
      if (opts === undefined) return reject(`PyropeActions#create() > 'opts' is not defined.`);
  
      let {fields} = opts;
  
      // if (tableName === undefined || !isString(tableName)) return reject(`PyropeActions#create() > 'tableName' is undefined or not a string.`);
      if (fields === undefined || !isObject(fields)) return reject(`PyropeActions#create() > 'fields' is undefined or not an object.`);
  
      fields.uuid = v4();
      fields.createdAt = Number(new Date().getTime());
      fields.updatedAt = Number(new Date().getTime());
      fields._table = this.fullTableName;
  
      ddbClient('put', {
        TableName: this.fullTableName,
        Item: fields
      })
        .then(() => this.increaseCounter())
        .then(() => resolve(fields))
        .catch(err => reject(`create() > ${err}`));
    });
  };
  
  /**
   * Updates an item
   *
   * Previously checks using findByIndex() if the item exits.
   *  If it doesn't, returns false.
   *
   * ```
   * opts = {
 *   tableName: String,
 *   index: Object,       // Index used to query the item.
 *   args: Object,        // Key-Value mapping of the arguments to change.
 *   beforeHook: (attrName, args) Function // Callback function for every field.
 *                                            Used to modify the key-value mapping of the fields to
 *                                            change before the item is updated. Must return object of
 *                                            shape {fieldName: value}
 *                                            Attribute names may be also modified.
 * }
   * ```
   *
   * @param {Object} opts Options mapping
   * @return {Object|Boolean} A key-value map with the updated fields or false if not found.
   * @todo: Handle unprocessedItems
   *
   */
  update(opts) {
    return new Promise((resolve, reject) => {
      if(opts === undefined) return reject(`PyropeActions#update() > 'opts' is not defined.`);
    
      let { index, fields } = opts;
    
      // if(tableName === undefined || !isString(tableName)) return reject(`PyropeActions#update() > 'tableName' is undefined or not a string.`);
      if(index === undefined || !isObject(index)) return reject(`PyropeActions#update() > 'index' is undefined or not an object.`);
      if(Object.keys(index).length < 1 || Object.keys(index).length > 2) return reject(`PyropeActions#update() > 'index' should have at least 1 item and at most 2.`);
      if(fields === undefined || !isObject(fields)) return reject(`PyropeActions#update() > 'fields' is undefined or not an object.`);
      // if(beforeHook && !isFunction(beforeHook)) return reject(`PyropeActions#update() > 'beforeHook' is not a function.`);
    
      this.findByIndex({
        tableName: this.fullTableName,
        index
      })
        .then(item => {
          if(isEmpty(fields)) {
            return item[0];
          } else if(item === false) {
            return false;
          } else if(isArray(item) && item.length > 1) {
            return reject(`Cannot update an array of records.`);
          } else if(isObject(item)) {
            return this._update({...opts, index: {uuid: item[0].uuid, createdAt: item[0].createdAt}})
              .then(item => resolve(item.Attributes))
              .catch(err => reject(err))
          } else {
            return false;
          }
        })
        .then(item => resolve(item))
        .catch(err => reject(`PyropeActions#update() > ${err}`));
    });
  }

  // Helper function that makes the actual update. This does not check if the item previously exists.
  _update(opts) {
    return new Promise((resolve, reject) => {
      if(opts === undefined) reject(`PyropeActions#_update() > 'opts' is not defined.`);
    
      let { index, fields, beforeHook } = opts;
    
      // if(tableName === undefined || !isString(tableName)) reject(`_update() > 'tableName' is undefined or not a string.`);
      if(index === undefined || !isObject(index)) reject(`_update() > 'index' is undefined or not an object.`);
      if(Object.keys(index).length < 1 || Object.keys(index).length > 2) reject(`_update() > 'index' should have at least 1 item and at most 2.`);
      if(fields === undefined || !isObject(fields)) reject(`_update() > 'fields' is undefined or not an object.`);
      // if(beforeHook && !isFunction(beforeHook)) reject(`_update() > 'beforeHook' is not a function.`);
    
      const hashKey = Object.keys(index)[0];
      const hashValue = index[hashKey];
      const rangeKey = Object.keys(index)[1];
      const rangeValue = index[rangeKey];
    
      // Mock beforeHook returning all argument {key:value} untouched
      if(!beforeHook) beforeHook = (attrName) => ({[attrName]: fields[attrName]});
    
      buildUpdateExpression(fields, beforeHook) // Build expression
        .then(expression => ({ // Build params
          TableName: this.fullTableName,
          Key: {
            [hashKey]: hashValue,
            [rangeKey]: rangeValue
          },
          ReturnValues: 'ALL_NEW',
          ...expression
        }))
        .then(params => ddbClient('update', params)) // DynamoDB Update
        .then(res => resolve(res)) // Resolve results
        .catch(err => reject(`PyropeActions#_update() > ${err}`));
    });
  }
  
  /**
   * Deletes an item
   *
   * Previously checks using findByIndex() if the item exits.
   *  If it doesn't, returns false, otherwise returns the deleted item.
   *
   * ```
   * opts = {
 *   tableName: String,
 *   index: Object,       // Index used to query the item.
 * }
   * ```
   *
   * @param {Object} opts Options mapping
   * @return {Object|Boolean} A key-value map with the deleted item's fields, false if not found
   * @todo: Handle unprocessedItems
   *
   */
  destroy(opts) {
    return new Promise((resolve, reject) => {
      if(opts === undefined) return reject(`PyropeActions#destroy() > 'opts' is not defined.`);
    
      let { index } = opts;
    
      // if(tableName === undefined || !isString(tableName)) return reject(`destroy() > 'tableName' is undefined or not a string.`);
      if(index === undefined || !isObject(index)) return reject(`PyropeActions#destroy() > 'index' is undefined or not an object.`);
      // if(index[Object.keys(index)[0]].length > 1) return reject(`destroy() > 'index' can only have one child.`);
      if(Object.keys(index).length < 1 || Object.keys(index).length > 2) return reject(`PyropeActions#destroy() > 'index' should have at least 1 item and at most 2.`);
    
      // console.log(`findByIndex.index: ${JSON.stringify(index, null, 2)}`);
      // console.log(`findByIndex.tableName: ${tableName}`);
    
      this.findByIndex({
        tableName: this.fullTableName,
        index
      })
        .then(item => {
          if(item === false) {
            return Promise.resolve(false);
          } else {
            const deleteRequests = item.map(item => ({DeleteRequest: {Key: {uuid: item.uuid, createdAt: item.createdAt}}}));
          
            const params = {
              RequestItems: {
                [this.fullTableName]: deleteRequests
              }
            };
          
            // console.log(`params: ${JSON.stringify(params, null, 2)}`);
          
            return ddbClient('batchWrite', params)
              .then(res => {
                if(res.UnprocessedItems && Object.keys(res.UnprocessedItems).length > 0) return Promise.reject('destroy() batch: Warning, unprocessed items.' + JSON.stringify(res.UnprocessedItems));
              
                return Promise.resolve(item[0]); //todo: should this return all deleted items?
              });
          }
        })
        .then(item => {
          if(isObject(item)) {
            return this.decreaseCounter().then(() => item);
          } else {
            return false;
          }
        })
        .then((res) => resolve(res))
        .catch(err => reject(`PyropeActions#destroy() > ${err}`))
    });
  }
  
  /**
   * Creates associations between entities
   *
   * Handles 1:1, 1:N and N:N associations.
   * (!) Does not check for the existence of the items.
   *
   * ```
   * opts = {
 *   tableName: String,
 *   items: [
 *     {
 *       index: {[indexName]: '123'}, // Can specify multiple values to associate
 *       [hasMany: Boolean = false]   // Used to specify 1:N and 1:N associations
 *     }
 *   ]
 * }
   * ```
   *
   * @param {Object} opts The options object.
   * @return {Boolean|Promise} Resolves to true if successful, throws otherwise
   * @todo: use batchWriteItem and handle unprocessedItems
   *
   */
  associate( opts ) {
    if(opts === undefined) return Promise.reject(`PyropeActions#associate() > opts should be an object.`);
    
    const { items } = opts;
    
    // General validations
    // if(tableName === undefined || !isString(tableName)) return Promise.reject(`PyropeActions#associate() > 'tableName' is undefined or not a string.`);
    if(items === undefined || !isArray(items)) return Promise.reject(`PyropeActions#associate(): 'items' is undefined or not an array.`);
    if(items.length !== 2) return Promise.reject(`PyropeActions#associate(): 'items' should have 2 elements.`);
    if((items[0].hasMany && !isBoolean(items[0].hasMany)) || (items[1].hasMany && !isBoolean(items[1].hasMany))) return Promise.reject(`PyropeActions#associate(): 'hasMany' should be boolean`);
    
    log('===========================================');
    log(`Associating: \n${JSON.stringify(items, null, 2)}`);
    
    // Iterate over the items (max 2)
    return iterateArrayOverPromise(items, (item, prevItemAction = {}, i) => {
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log(`* item[${i}] = ${JSON.stringify(item, null, 2)}`);
      log(`prevItemAction = ${JSON.stringify(prevItemAction, null, 2)}`);
      
      // Item validations
      if(Object.keys(item.index).length !== 1) return Promise.reject(`PyropeActions#associate(): 'items[${i}].index' should have only 1 key-value pair.`);
      
      const index = item.index;
      const indexKey = Object.keys(index)[0];
      const indexValues = isArray(index[indexKey]) ? index[indexKey] : [index[indexKey]];
      const itemHasMany = item.hasMany;
      
      // log(`itemIndex = ${JSON.stringify(itemIndex, null, 2)}`);
      // log(`itemIndexKey = ${JSON.stringify(itemIndexKey, null, 2)}`);
      // log(`itemIndexValues = ${JSON.stringify(itemIndexValues, null, 2)}`);
      
      // Iterate over each item's uuids
      return iterateArrayOverPromise(indexValues, (indexValue, prevValueAction = {}) => {
        const currIndex = {[indexKey]: indexValue};
        
        log('···········································');
        log(`* currIndex = ${JSON.stringify(currIndex, null, 2)}`);
        log(`prevUuidAction: ${JSON.stringify(prevValueAction, null, 2)}`);
        
        // Get the current item's uuid associations
        return this.findByIndex({
          tableName: this.fullTableName,
          index: currIndex
        }).then(itemAssociations => {
          log('item associations', itemAssociations);
          
          // Write current item's uuid if nothing found
          if(itemAssociations === false) {
            log(`No previous associations...`);
            
            // Add the current item's uuid
            return buildAction('write', prevValueAction, prevItemAction, currIndex);
            
          } else {
            if (!isArray(itemAssociations)) itemAssociations = [itemAssociations];
            
            const otherItem = items[1 - i];
            const otherIndex = otherItem.index;
            const otherIndexKey = Object.keys(otherIndex)[0];
            const otherIndexValues = isArray(otherIndex[otherIndexKey]) ? otherIndex[otherIndexKey] : [otherIndex[otherIndexKey]];
            
            const itemAssociatedValues = pluck(itemAssociations, otherIndexKey);
            const alreadyAssociated = intersection(itemAssociatedValues, otherIndexValues);
            
            log(`${JSON.stringify(currIndex)}.hasMany = ${itemHasMany}`);
            log(`${JSON.stringify(currIndex)}.${otherIndexKey}s = ${JSON.stringify(itemAssociatedValues, null, 2)}`);
            log(`${otherIndexKey}.uuids = ${JSON.stringify(otherIndexValues, null, 2)}`);
            log(`alreadyAssociated = ${JSON.stringify(alreadyAssociated, null, 2)}`);
            
            // Preserve these associations
            if(itemHasMany === true) {
              log(`${index}.hasMany: Preserving previous association(s).`);
              
              if(alreadyAssociated.length === otherIndexValues.length) {
                return buildAction('skip', prevValueAction, prevItemAction, currIndex);
              } else {
                return buildAction('write', prevValueAction, prevItemAction, currIndex);
              }
              
            } else {
              log(`Deleting previous association.`);
              log(`currIndex: ${JSON.stringify(currIndex)}`);
              
              return this.destroy({
                index: currIndex
              }).then((res) => {
                if(res === false) return Promise.reject(`Could not destroy association ${JSON.stringify(index)}`);
                
                log(`Destroyed ${JSON.stringify(currIndex)}`);
                
                return buildAction('write', prevValueAction, prevItemAction, currIndex);
              })
            }
          }
        })
      }, true).then(action => {
        // End of uuid iteration
        // todo: Remove this then()
        log('\nEnd of uuid iteration');
        log(`Action: ${JSON.stringify(action, null, 2)}`);
        
        if(!isObject(action)) return Promise.reject(`Invalid action, should be object.`);
        
        return action;
      })
    }, true).then(action => {
      // End of item iteration
      log('\nEnd of item iteration');
      log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
      log(`Action: ${JSON.stringify(action, null, 2)}`);
      
      if(!isObject(action)) return Promise.reject(`Invalid action, should be object.`);
      
      // If there are actions to write...
      if(action.write) {
        action.skip = action.skip ? action.skip : [];
        
        const writeKeys = Object.keys(action.write);
        const skipKeys = difference(Object.keys(action.skip), writeKeys);
        
        log(`writeKeys = ${writeKeys}`);
        log(`skipKeys = ${skipKeys}`);
        
        const writeItems = writeKeys.map(item => {
          return {index: item, uuids: action.write[item]};
        }).concat(skipKeys.map(item => {
          return {index: item, uuids: action.skip[item]};
        }));
        
        log(`keys = ${JSON.stringify(writeItems, null ,2)}`);
        
        if(Object.keys(writeItems).length !== 2) return Promise.reject(`Attempting to assign with only one item.`);
        
        log(`\nAbout to write associations...`);
        
        // TODO: Use batchWrite
        // TODO: Critical! Watch for failed requests
        return iterateArrayOverPromise(writeItems[0].uuids, item0uuid => {
          return iterateArrayOverPromise(writeItems[1].uuids, item1uuid => {
            return this.create({
              fields: {
                [writeItems[0].index]: item0uuid,
                [writeItems[1].index]: item1uuid
              }
            }).then(res => true)
          }, true)
        }, true)
      } else {
        return false;
      }
    }).catch(err => Promise.reject(`PyropeActions#associate() > ${err}`));
  };
  
  
  /**
   * Dissociates two items if an association is found
   *
   * item[0].uuid should be a scalar
   * item[1].uuid can be an array of associations to remove.
   *
   * ```
   * opts = {
 *   tableName: String,
 *   items: [
 *     {
 *       index: {indexName: any}, // index values should be a scalar
 *     },
 *     {
 *       index: {indexName: [any]}, // index values can be an array
 *     }
 *   ]
 * }
   * ```
   *
   * @param {Object} opts The options object
   * @return {Promise<Boolean>} true if the association was removed, false if there is no association
   *
   * @todo: Handle unprocessed items. (critical)
   *
   */
  dissociate( opts ) {
    if(!isObject(opts)) return Promise.reject(`PyropeActions#dissociate() : 'opts' should be an object.`);
    
    const { items } = opts;
    
    let deleteRequests = [];
    
    // Validations
    if(items === undefined || !isArray(items)) return Promise.reject(`PyropeActions#dissociate() : 'items' is undefined or not an array.`);
    // if(tableName === undefined) return Promise.reject(`PyropeActions#dissociate() : 'tableName' is undefined or not a string.`);
    if(items.length !== 2) return Promise.reject(`PyropeActions#dissociate() : 'items' should have 2 elements.`);
    if(items[0].index === undefined || items[1].index === undefined) return Promise.reject(`PyropeActions#dissociate() : 'items' should have an index.`);
    
    const index = items[0].index;
    const indexKey = Object.keys(index)[0];
    const indexValues = index[indexKey];
    
    const otherIndex = items[1].index;
    const otherIndexKey = Object.keys(otherIndex)[0];
    const otherIndexValues =
      isEmpty(otherIndex[otherIndexKey]) ?
        null :
        isArray(otherIndex[otherIndexKey]) ?
          otherIndex[otherIndexKey] :
          [otherIndex[otherIndexKey]];
    
    if(isArray(indexValues)) return Promise.reject(`PyropeActions#dissociate() : items[0] index value (uuid) cannot be an array.`);
    
    log(`Dissociating ${JSON.stringify(opts, null, 2)}`);
    
    return this.findByIndex({
      tableName: this.fullTableName,
      index
    }).then(res => {
      if(res === false) return Promise.resolve(false); // No association found
      
      log(`${index} associations = ${JSON.stringify(res, null, 2)}`);
      
      let notFound = [];
      
      // Build deleteRequests object
      if(otherIndexValues === null){
        log(`other index lvalues is null for ${otherIndexKey}`);
        
        deleteRequests = res.map(currItem => ({DeleteRequest: {Key: {uuid: currItem.uuid, createdAt: currItem.createdAt}}}));
      } else {
        deleteRequests = res.filter(currItem => {
          let flag = false;
          
          otherIndexValues.forEach(val => {
            flag = flag || (currItem[otherIndexKey] === val)
          });
          
          return flag;
        });
        
        notFound = difference(otherIndexValues, pluck(deleteRequests, otherIndexKey));
        deleteRequests = deleteRequests.map(currItem => ({DeleteRequest: {Key: {uuid: currItem.uuid, createdAt: currItem.createdAt}}}));
      }
      
      if(notFound.length > 0) return Promise.reject(`${otherIndexKey}[${notFound}] is not associated to ${indexKey}[${indexValues}]`);
      if(deleteRequests.length === 0) return Promise.resolve(false);
      
      const params = {
        RequestItems: {
          [this.fullTableName]: deleteRequests
        }
      };
      
      return Promise.resolve(params);
    })
      .then(params => {
        if(params) {
          return ddbClient('batchWrite', params)
            .then(res => {
              if (res.UnprocessedItems && Object.keys(res.UnprocessedItems).length > 0) return Promise.reject('dissociate() batch: Warning, unprocessed items.' + JSON.stringify(res.UnprocessedItems, null, 2));
            })
            .then(() => this.updateCounter({
              step: -1 * deleteRequests.length
            }))
            .then(() => Promise.resolve(true))
        } else {
          return Promise.resolve(false);
        }
      })
      .catch(err => Promise.reject(`PyropeActions#dissociate() > ${err}`))
  };
  
  /**
   *  Returns the associations of the specified item with respect to another item
   *
   * ```
   *  opts = {
 *    tableName: String,
 *    items: [
 *      {
 *        index: {key: value}
 *      },
 *      {
 *        index: String
 *      }
 *    ]
 *  }
   *  ```
   *
   *  @todo accept query expressions
   *  @params {Object} opts The options object.
   *  @return {Promise} - Array of uuids, [] if no assoc. found
   */
  getAssociations( opts ) {
    return new Promise((resolve, reject) => {
      if(!isObject(opts)) return reject(`PyropeActions#getAssociations() : 'opts' should be an object.`);
    
      const { items } = opts;
    
      if(items === undefined || !isArray(items)) return reject(`PyropeActions#getAssociations() : 'items' is undefined or not an array.`);
      // if(tableName && (tableName === undefined || !isString(tableName))) return reject(`PyropeActions#getAssociations() : 'tableName' is undefined or not a string.`);
      if(items.length !== 2) return reject(`PyropeActions#getAssociations() : 'items' should have 2 elements.`);
      if(!isObject(items[0].index)) return reject(`PyropeActions#getAssociations() : items[0].index should be an object.`);
      if(!isString(items[1].index)) return reject(`PyropeActions#getAssociations() : items[1].index should be a string.`);
    
      const indexKey = Object.keys(items[0].index)[0];
      const indexValue = items[0].index[indexKey];
    
      this.findByIndex({
        tableName: this.fullTableName,
        index: {[indexKey]: indexValue}
      })
        .then(res => resolve(pluck(res, items[1].index))) // todo: use query expressions instead
        .catch(err => reject(`PyropeActions#getAssociations() > ${err}`));
    });
  }
}