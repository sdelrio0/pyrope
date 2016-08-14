
import { ddbClient } from './core';
import { isNumber, isArray, isBoolean, isString, pluck, isObject, isFunction } from 'underscore';
import { buildUpdateExpression, genTableDigest } from './utils';
import { increaseCounter, decreaseCounter } from './counters';
import { v4 } from 'uuid';

const COUNTERS_TABLE_NAME = 'table_counters';

/**
 * Returns an array with the mappings for every record in the table.
 *
 * Results are returned sorted ascending. You can specify a limit  and a cursor
 * to do batch fetching.
 *
 * opts = {
 *  tableName: String,     // The name of the table
 *  ascending: Boolean,    // Should the results be returned in a ascending manner?
 *  limit: Integer,        // The amount of items to fetch
 *  cursor: String         // A base64 encoded map of the key containing {uuid: String, createdAt: Number, _table: String}
 * }
 *
 *
 * @param {object} opts Options mapping.
 * @return {array} An array with the QUERY result, has the structure {Items: [], Count: 0, Cursor: ''}
 *
 * @TODO: Select specific attributes to return.
 */
export const all = (opts) => new Promise((resolve, reject) => {
  if(opts === undefined) return reject(`all(): 'opts' is not defined.`);
  
  let { tableName, ascending = true, limit = 0, cursor } = opts;
  
  if(tableName === undefined || !isString(tableName)) return reject(`all(): 'tableName' is undefined or not a string.`);
  if(ascending && !isBoolean(ascending)) return reject(`all(): 'ascending' is not boolean.`);
  if(limit && !isNumber(limit)) return reject(`all(): 'limit' is not a number.`);
  if(cursor && !isString(cursor)) return reject(`all(): 'cursor' is not a string.`);
  
  let params = {
    TableName: tableName,
    IndexName: '_tableIndex',
    KeyConditionExpression: `#t = :t`,
    ExpressionAttributeNames: {
      '#t': '_table'
    },
    ExpressionAttributeValues: {
      ':t': tableName
    },
    ScanIndexForward: ascending,
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
      return reject(`all(): Error parsing cursor: ${err}`);
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
    .catch(err => reject(`all(): ${err}`));
});

export const take = (opts) => {
  let { tableName, limit = 1, cursor, ascending = true } = opts;
  
  return all({tableName, limit, cursor, ascending});
};

export const first = (opts) => {
  let { tableName, limit = 1, cursor } = opts;
  
  return take({tableName, limit, cursor});
};

export const last = (opts) => {
  let { tableName, limit = 1, cursor } = opts;
  
  return take({tableName, limit, ascending: false, cursor});
};

/**
 * Queries a table and looks for items matching the specified index.
 *
 * The index mapping has the following structure:
 *
 * index = {
 *   username: 'john'
 * }
 *
 * In order to find the table's index, the word 'Index' is appended, resulting
 * in this example in 'usernameIndex'
 *
 * Every index has a 'createdAt' range key. This is calculated and
 * appended automatically before querying.
 *
 * opts = {
 *   tableName: String,
 *   index: {hash: value, [range: value]},
 *   ascending: Boolean
 * }
 *
 * @param {object} opts Options mapping.
 * @return {Array|Boolean} Array when there are multiple matches, false when not found
 *
 */
export const findByIndex = (opts) => new Promise((resolve, reject) => {
  if(opts === undefined) return reject(`findByIndex(): 'opts' is not defined.`);
  
  let { tableName, index, ascending = true } = opts;
  
  if(tableName === undefined || !isString(tableName)) return reject(`findByIndex(): 'tableName' is undefined or not a string.`);
  if(index === undefined || !isObject(index)) return reject(`findByIndex(): 'index' is undefined or not an object.`);
  if(Object.keys(index).length > 2) return reject(`findByIndex(): 'index' should have at most 2 key-value pairs.`);
  if(Object.keys(index).length < 1) return reject(`findByIndex(): 'index' should have at least 1 key-value pair.`);
  
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
    ScanIndexForward: ascending,
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
    .catch(err => reject(`findByIndex(): ${err}`));
});

/**
 * Returns the table's item count
 *
 * opts = {
 *   tableName: String
 * }
 *
 * @param {Object} opts The options object.
 * @return {Number} The item count.
 */
export const count = ( opts ) => new Promise((resolve, reject) => {
  if(opts === undefined) return reject(`count(): 'opts' is not defined.`);
  
  const { tableName } = opts;
  
  if(tableName === undefined || !isString(tableName)) return reject(`count(): 'tableName' is undefined or not a string.`);
  
  const counterTableName = process.env.NODE_ENV === 'test' ? '_test_' + COUNTERS_TABLE_NAME : COUNTERS_TABLE_NAME;
  
  let count = 0;
   
  findByIndex({
    tableName: counterTableName,
    index: {tableDigest: genTableDigest(tableName)}
  })
    .then(res => {
      if(res === false) {
        resolve(0);
      } else {
        resolve(res[0].count);
      }
    })
    .catch(err => reject(`count(): ${err}`));
});

/**
 * Creates a new record in the specified table.
 *
 * It will create the record without any conditions.
 * The following attributes are auto-generated: uuid, createdAt, updatedAt
 *
 * opts = {
 *   tableName: 'users',
 *   attributes: {
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
 *
 * @param {object} opts Options mapping.
 * @return {object} The attributes of the newly created record, rejection on error
 * @todo: Handle unprocessedItems
 * @todo: Handle failed increaseCounter()
 * @todo: let uuid, createdAt, updatedAt to be cofigurable ?
 *
 */
export const create = (opts) => new Promise((resolve, reject) => {
  // todo: Sanitize variables (convert empty strings to null)
  if(opts === undefined) return reject(`create(): 'opts' is not defined.`);
  
  let { tableName, attributes } = opts;
  
  if(tableName === undefined || !isString(tableName)) return reject(`create(): 'tableName' is undefined or not a string.`);
  if(attributes === undefined || !isObject(attributes)) return reject(`create(): 'attributes' is undefined or not an object.`);
  
  attributes.uuid = v4();
  attributes.createdAt = Number(new Date().getTime());
  attributes.updatedAt = Number(new Date().getTime());
  attributes._table = tableName;
  
  ddbClient('put', {
    TableName: tableName,
    Item: attributes
  })
    .then(() => increaseCounter({tableName}))
    .then(() => resolve(attributes))
    .catch(err => reject(`create(): ${err}`));
});

/**
 * Updates an item
 *
 * Previously checks using findByIndex() if the item exits.
 *  If it doesn't, returns false.
 *
 * opts = {
 *   tableName: String,
 *   index: Object,       // Index used to query the item.
 *   args: Object,        // Key-Value mapping of the arguments to change.
 *   beforeHook: (attrName, args) Function // Callback function for every attribute.
 *                                            Used to modify the key-value mapping of the attributes to
 *                                            change before the item is updated. Must return object of
 *                                            shape {attributeName: value}
 *                                            Attribute names may be also modified.
 * }
 *
 * @param {Object} opts Options mapping
 * @return {Object|Boolean} A key-value map with the updated attributes or false if not found.
 * @todo: Handle unprocessedItems
 *
 */
export const update = (opts) => new Promise((resolve, reject) => {
  if(opts === undefined) return reject(`update(): 'opts' is not defined.`);
  
  let { tableName, index, attributes, beforeHook } = opts;
  
  if(tableName === undefined || !isString(tableName)) return reject(`update(): 'tableName' is undefined or not a string.`);
  if(index === undefined || !isObject(index)) return reject(`update(): 'index' is undefined or not an object.`);
  if(Object.keys(index).length < 1 || Object.keys(index).length > 2) return reject(`update(): 'index' should have at least 1 item and at most 2.`);
  if(attributes === undefined || !isObject(attributes)) return reject(`update(): 'attributes' is undefined or not an object.`);
  if(beforeHook && !isFunction(beforeHook)) return reject(`update(): 'beforeHook' is not a function.`);
  
  findByIndex({
    tableName,
    index
  })
    .then(item => {
      if(item === false) {
        return Promise.resolve(false);
      } else if(isArray(item) && item.length > 1) {
        return Promise.reject(`Cannot update an array of items.`);
      } else {
        return Promise.resolve(item);
      }
    })
    .then(item => {
      if(isObject(item)) {
        _update({...opts, index: {uuid: item[0].uuid, createdAt: item[0].createdAt}})
          .then(item => resolve(item.Attributes))
      } else {
        resolve(false);
      }
    })
    .catch(err => reject(`update(): ${err}`));
});

// Helper function that makes the actual update. This does not check if the item previously exists.
const _update = (opts) => new Promise((resolve, reject) => {
  if(opts === undefined) reject(`_update(): 'opts' is not defined.`);
  
  let { tableName, index, attributes, beforeHook } = opts;
  
  if(tableName === undefined || !isString(tableName)) reject(`_update(): 'tableName' is undefined or not a string.`);
  if(index === undefined || !isObject(index)) reject(`_update(): 'index' is undefined or not an object.`);
  if(Object.keys(index).length < 1 || Object.keys(index).length > 2) reject(`_update(): 'index' should have at least 1 item and at most 2.`);
  if(attributes === undefined || !isObject(attributes)) reject(`_update(): 'attributes' is undefined or not an object.`);
  if(beforeHook && !isFunction(beforeHook)) reject(`_update(): 'beforeHook' is not a function.`);
  
  const hashKey = Object.keys(index)[0];
  const hashValue = index[hashKey];
  const rangeKey = Object.keys(index)[1];
  const rangeValue = index[rangeKey];
  
  // Mock beforeHook returning all argument {key:value} untouched
  if(!beforeHook) beforeHook = (attrName) => ({[attrName]: attributes[attrName]});
  
  buildUpdateExpression(attributes, beforeHook) // Build expression
    .then(expression => ({ // Build params
      TableName: tableName,
      Key: {
        [hashKey]: hashValue,
        [rangeKey]: rangeValue
      },
      ReturnValues: 'ALL_NEW',
      ...expression
    }))
    .then(params => ddbClient('update', params)) // DynamoDB Update
    .then(res => resolve(res)) // Resolve results
    .catch(err => reject(`_update(): ${err}`));
});

/**
 * Deletes an item
 *
 * Previously checks using findByIndex() if the item exits.
 *  If it doesn't, returns false, otherwise returns the deleted item.
 *
 * opts = {
 *   tableName: String,
 *   index: Object,       // Index used to query the item.
 * }
 *
 * @param {Object} opts Options mapping
 * @return {Object|Boolean} A key-value map with the deleted item's attributes, false if not found
 * @todo: Handle unprocessedItems
 *
 */
export const destroy = (opts) => new Promise((resolve, reject) => {
  if(opts === undefined) return reject(`destroy(): 'opts' is not defined.`);
  
  let { tableName, index } = opts;
  
  if(tableName === undefined || !isString(tableName)) return reject(`destroy(): 'tableName' is undefined or not a string.`);
  if(index === undefined || !isObject(index)) return reject(`destroy(): 'index' is undefined or not an object.`);
  if(Object.keys(index).length < 1 || Object.keys(index).length > 2) return reject(`destroy(): 'index' should have at least 1 item and at most 2.`);
  
  findByIndex({
    tableName,
    index
  })
    .then(item => {
      if(item === false) {
        return Promise.resolve(false);
      } else {
        const deleteRequests = item.map(item => ({DeleteRequest: {Key: {uuid: item.uuid, createdAt: item.createdAt}}}));
        
        const params = {
          RequestItems: {
            [tableName]: deleteRequests
          }
        };
        
        return ddbClient('batchWrite', params)
          .then(res => {
            if(res.UnprocessedItems && Object.keys(res.UnprocessedItems).length > 0) return Promise.reject('destroy() batch: Warning, unprocessed items.' + JSON.stringify(res.UnprocessedItems));
  
            return Promise.resolve(item[0]);
          });
      }
    })
    .then(item => {
      if(isObject(item)) {
        return decreaseCounter(opts).then(() => item);
      } else {
        return false;
      }
    })
    .then((res) => resolve(res))
    .catch(err => reject(`destroy(): ${err}`))
});