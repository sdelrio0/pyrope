
import { findByIndex, create, destroy } from './actions';
import { difference, intersection, isObject, isArray, isBoolean, isString, pluck } from 'underscore';
import { ddbClient } from './core';
import { iterateArrayOverPromise, buildAction } from './utils';
import { updateCounter } from './counters';

const DEBUG = false;

const log = (msg) => {if(DEBUG)console.log(msg)};

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
export const associate = ( opts ) => {
  if(opts === undefined) return Promise.reject(`associate(): opts should be an object.`);
  
  const { tableName, items } = opts;
  
  // General validations
  if(tableName === undefined || !isString(tableName)) return Promise.reject(`associate(): 'tableName' is undefined or not a string.`);
  if(items === undefined || !isArray(items)) return Promise.reject(`associate(): 'items' is undefined or not an array.`);
  if(items.length !== 2) return Promise.reject(`associate(): 'items' should have 2 elements.`);
  if((items[0].hasMany && !isBoolean(items[0].hasMany)) || (items[1].hasMany && !isBoolean(items[1].hasMany))) return Promise.reject(`associate(): 'hasMany' should be boolean`);
   
  log('===========================================');
  log(`Associating: \n${JSON.stringify(items, null, 2)}`);
   
  // Iterate over the items (max 2)
  return iterateArrayOverPromise(items, (item, prevItemAction = {}, i) => {
    log('~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~');
    log(`* item[${i}] = ${JSON.stringify(item, null, 2)}`);
    log(`prevItemAction = ${JSON.stringify(prevItemAction, null, 2)}`);
    
    // Item validations
    if(Object.keys(item.index).length !== 1) return Promise.reject(`associate(): 'items[${i}].index' should have only 1 key-value pair.`);
    
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
      return findByIndex({
        tableName,
        index: currIndex
      }).then(itemAssociations => {
        log('item associations', itemAssociations)
        
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
    
            return destroy({
              tableName,
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
          return create({
            tableName,
            attributes: {
              [writeItems[0].index]: item0uuid,
              [writeItems[1].index]: item1uuid
            }
          }).then(res => true)
        }, true)
      }, true)
    } else {
      return false;
    }
  }).catch(err => Promise.reject(`associate(): ${err}`));
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
 * @return {Boolean} true if the association was removed, false if there is no association
 *
 * @todo: Handle unprocessed items. (critical)
 *
 */
export const dissociate = ( opts ) => {
  if(!isObject(opts)) return Promise.reject(`dissociate(): 'opts' should be an object.`);
  
  const { tableName, items } = opts;
  
  let deleteRequests = [];
  
  // Validations
  if(items === undefined || !isArray(items)) return Promise.reject(`dissociate(): 'items' is undefined or not an array.`);
  if(tableName === undefined) return Promise.reject(`dissociate(): 'tableName' is undefined or not a string.`);
  if(items.length !== 2) return Promise.reject(`dissociate(): 'items' should have 2 elements.`);
  if(items[0].index === undefined || items[1].index === undefined) return Promise.reject(`dissociate(): 'items' should have an index.`);
  
  const index = items[0].index;
  const indexKey = Object.keys(index)[0];
  const indexValues = index[indexKey];
  
  const otherIndex = items[1].index;
  const otherIndexKey = Object.keys(otherIndex)[0];
  const otherIndexValues =
    otherIndex[otherIndexKey] === null ?
      null :
      isArray(otherIndex[otherIndexKey]) ?
        otherIndex[otherIndexKey] :
        [otherIndex[otherIndexKey]];
  
  if(isArray(indexValues)) return Promise.reject(`dissociate(): items[0] index value (uuid) cannot be an array.`);
  
  log(`Dissociating ${JSON.stringify(opts, null, 2)}`);
    
  return findByIndex({
    tableName,
    index: index
  }).then(res => {
    if(res === false) return Promise.resolve(false); // No association found
    
    log(`${index}] associations = ${JSON.stringify(res, null, 2)}`);
  
    // Build deleteRequests object
    if(otherIndexValues === null){
      deleteRequests = res.map(currItem => ({DeleteRequest: {Key: {uuid: currItem.uuid, createdAt: currItem.createdAt}}}));
    } else {
      deleteRequests = res.filter(currItem => {
        let flag = false;
        
        otherIndexValues.forEach(val => {
          flag = flag || (currItem[otherIndexKey] === val)
        });
        
        return flag;
      }).map(currItem => ({DeleteRequest: {Key: {uuid: currItem.uuid, createdAt: currItem.createdAt}}}));
    }
    
    if(deleteRequests.length === 0) return Promise.resolve(false);
  
    const params = {
      RequestItems: {
        [tableName]: deleteRequests
      }
    };
  
    log(`dissociate params: ${JSON.stringify(params, null, 2)}`);
    
    return Promise.resolve(params);
  })
    .then(params => ddbClient('batchWrite', params)
    .then(res => {
      if(res.UnprocessedItems && Object.keys(res.UnprocessedItems).length > 0) return Promise.reject('dissociate() batch: Warning, unprocessed items.' + JSON.stringify(res.UnprocessedItems, null, 2));
    })
    .then(() => updateCounter({
      tableName,
      step: -1 * deleteRequests.length
    }))
    .then(() => Promise.resolve(true)))
    .catch(err => Promise.reject(`dissociate(): ${err}`))
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
 *  @params {Object} opts The options object.
 *  @return {Promised Array}
 */
export const getAssociations = ( opts ) => new Promise((resolve, reject) => {
  if(!isObject(opts)) return reject(`getAssociations(): 'opts' should be an object.`);
  
  const { tableName, items } = opts;
  
  if(items === undefined || !isArray(items)) return reject(`getAssociations(): 'items' is undefined or not an array.`);
  if(tableName === undefined) return reject(`getAssociations(): 'tableName' is undefined or not a string.`);
  if(items.length !== 2) return reject(`getAssociations(): 'items' should have 2 elements.`);
  if(!isObject(items[0].index)) return reject(`getAssociations(): items[0].index should be an object.`);
  if(!isString(items[1].index)) return reject(`getAssociations(): items[1].index should be a string.`);
  
  const indexKey = Object.keys(items[0].index)[0];
  const indexValue = items[0].index[indexKey];
  
  findByIndex({
    tableName,
    index: {[indexKey]: indexValue}
  })
    .then(res => resolve(pluck(res, items[1].index)))
    .catch(err => reject(`getAssociations(): ${err}`));
});