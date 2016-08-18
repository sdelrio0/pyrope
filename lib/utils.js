import { extend, omit, mapObject, isString, isFunction, sortBy, isArray, isObject } from 'underscore';
import Inflector from 'inflected';
import crypto from 'crypto';

const DEBUG = false;

const log = (msg, json) => {if(DEBUG) {console.log(`----------------------------\n${msg}${json ? JSON.stringify(json, null, 2) : ''}\n`)}};

/**
 * Builds an UpdateExpression to use in 'params' using only the provided item fields.
 *
 * It makes the assumption that the HASH key is 'uuid' (and is excluded) and that every updated model has the attribute 'updatedAt'
 *
 * @param {object} args The item to update in the form {uuid: '123', field1: 'newValue', ...}
 * @param {function} fn(attrName, args) Callback function to filter the fields.
 *   The function has to return an object with the desired Name and Value in the form {name: 'value'}
 *   If null or undefined are returned, the field is ignored.
 * @return {object} An object to be merged in params, in the form
 *   {UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues}
 */
export const buildUpdateExpression = (args, hookFn) => new Promise((resolve, reject) => {
  const mapExpression = (prevExpression, attrMap) => {
    if (attrMap) {
      const key = Object.keys(attrMap)[0];
      const val = attrMap[key];
    
      return {...prevExpression, [key]: val};
    } else {
      return prevExpression;
    }
  };
  
  const fields = omit(args, 'uuid');
  
  iterateArrayOverPromise(Object.keys(fields), (attrName, prevExpression) => {
    try { // hookFn is a promise
      return hookFn(attrName, args)
        .then(attrMap => mapExpression(prevExpression, attrMap))
        .catch(err => Promise.reject(`hookFn(): ${err}`));
    } catch(err) { // hookFn is a regular function
      return Promise.resolve(mapExpression(prevExpression, hookFn(attrName, args)))
    }
  }, true).then(expression => {
    if(!expression) expression = {};
    if(!expression.updatedAt) expression.updatedAt = Number(new Date().getTime()); // Set updatedAt field in case it wasn't provided
  
    let updateExpressionArr = [];
    let updateExpression;
    let expressionAttributeNames = {};
    let expressionAttributeValues = {};
  
    mapObject(expression, (val, key) => {
      updateExpressionArr.push(`#${key} = :${key}`);
      expressionAttributeNames[`#${key}`] = key;
      expressionAttributeValues[`:${key}`] = val;
    });
  
    updateExpression = `SET ${updateExpressionArr.join(', ')}`;
  
    resolve({
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
    });
    
  }).catch(err => reject(`buildUpdateExpression(): ${err}`));
});

export const sha256 = (data) => {
  if(!data || !isString(data)) throw new Error(`sha256(): Invalid value for data`);
  
  const hash = crypto.createHash('sha256');
  
  hash.update(data);
  
  return hash.digest('hex');
};

export const genTableDigest = ( tableName ) => (sha256(tableName)+'.'+tableName);

/**
 * Iterates a promise over each element of the array
 * If chaining is true, the resolved value is passed
 *  on to the promise of the following iteration
 *
 * Promise should have the signature (arg, prev)
 *  Where arg is the current iterated item from the array
 *  and prev is the previously resolved value.
 *
 * @param {Array} arr The array to iterate
 * @param {Function} fn The promise to use
 * @param {Boolean} chained Optional. Pass the resolved value on to the following iteration?
 * @result The resolved value of the last iteration. undefined if chained is false.
 * @todo: Substitute with Promise.each() ?
 * @todo: Check for possible bug when fn doesn't return a Promise
 */
export const iterateArrayOverPromise = (arr, fn, chained = false, index = 0, value = undefined) => {
  if(index === arr.length) return Promise.resolve(value);
  
  return (chained ? fn(arr[index], value, index) : fn(arr[index], index))
    .then(res => iterateArrayOverPromise(arr, fn, chained, ++index, chained ? res : undefined))
    .catch(err => Promise.reject(`iterateArrayOverPromise(): ${err}`));
};

export const buildAction = (type, prevUuidAction, prevItemAction, index) => {
  const key = Object.keys(index)[0];
  const val = index[key];
  
  let action = extend({}, prevItemAction, prevUuidAction);
  
  if(!action[type]) action[type] = {};
  if(!action[type][key]) action[type][key] = [];
  
  action[type][key].push(val);
  
  return action;
};

export const buildAssociationTableName = (modelName, associationKey) => {
  let table = sortBy([modelName, associationKey].map(t => Inflector.tableize(t)), t => t).join('_');
  
  if(process.env.NODE_ENV === 'test') {
    table = '_test_' + table;
  }
  
  return table;
};

export const buildItemIndices = (uuid, childIndex, modelName, modelFields) => {
  if(!uuid) throw new Error(`'uuid' is undefined.`);
  if(!childIndex || !isObject(childIndex)) throw new Error(`'index' is undefined or not an object.`);
  if(Object.keys(childIndex).length > 1) throw new Error(`'index' should have only one key-value pair.`);
  
  let childFieldKey = Object.keys(childIndex)[0];
  let parentFieldKey = Inflector.underscore(Inflector.singularize(modelName));
  
  const childIndexKey = Inflector.underscore(Inflector.singularize(Object.keys(childIndex)[0]));
  const childIndexValue = childIndex[childFieldKey];
  
  const parentIndexKey = Inflector.underscore(Inflector.singularize(modelName));
  const parentIndexValue = uuid;
  
  log(`parentIndexKey: ${parentIndexKey}`);
  log(`parentIndexValue: ${parentIndexValue}`);
  log(`childFieldKey: ${childFieldKey}`);
  log(`childIndexKey: ${childIndexKey}`);
  log(`childIndexValue: ${childIndexValue}`);
  //log(`${modelName}.fields`, modelFields);
  
  // In case the field is plural
  if(!Object.keys(modelFields).find(f => f === childFieldKey)) {
    childFieldKey = Inflector.pluralize(childFieldKey);
    
    if(!Object.keys(modelFields).find(f => f === childFieldKey)) throw new Error(`'${childFieldKey}' is not a field of '${modelName}'.`);
  }
  
  //log(`${modelName}.fields[${childFieldKey}]`, modelFields[childFieldKey].type.ofType._typeConfig.fields());
  
  if(!modelFields[childFieldKey].type) throw new Error(`'${childFieldKey}' is missing 'type'.`);
  
  let childFields;
  
  // If its a GraphQLList:
  if(modelFields[childFieldKey].type.ofType) {
    if(!modelFields[childFieldKey].type.ofType._typeConfig) throw new Error(`'${childFieldKey}.type.ofType' is missing '_typeConfig'.`);
    if(!modelFields[childFieldKey].type.ofType._typeConfig.fields) throw new Error(`'${childFieldKey}' is missing 'fields'.`);
    
    // In case the field is plural
    if(!(Object.keys(modelFields[childFieldKey].type.ofType._typeConfig.fields()).find(f => f === parentFieldKey ))) {
      parentFieldKey = Inflector.pluralize(parentFieldKey);
      
      if(!(Object.keys(modelFields[childFieldKey].type.ofType._typeConfig.fields()).find(f => f === parentFieldKey ))) throw new Error(`'${childFieldKey}' is missing association with field '${parentFieldKey}'.`);
    }
    
    childFields = modelFields[childFieldKey].type.ofType._typeConfig.fields();
    // If its a Scalar Type:
  } else {
    if(!modelFields[childFieldKey].type._typeConfig) throw new Error(`'${childFieldKey}.type' is missing '_typeConfig'.`);
    if(!modelFields[childFieldKey].type._typeConfig.fields) throw new Error(`'${childFieldKey}' is missing 'fields'.`);
    
    // In case the field is plural
    if(!(Object.keys(modelFields[childFieldKey].type._typeConfig.fields()).find(f => f === parentFieldKey ))) {
      parentFieldKey = Inflector.pluralize(parentFieldKey);
      
      if(!(Object.keys(modelFields[childFieldKey].type._typeConfig.fields()).find(f => f === parentFieldKey ))) throw new Error(`'${childFieldKey}' is missing association with field '${parentFieldKey}'.`);
    }
    
    childFields = modelFields[childFieldKey].type._typeConfig.fields();
  }
  
  const parentFields = modelFields;
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
};