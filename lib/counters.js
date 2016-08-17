import { isNumber } from 'underscore';
import { genTableDigest } from './utils';
import { ddbClient } from './core';

export const increaseCounter = ( opts ) => updateCounter({...opts, step: 1});

export const decreaseCounter = ( opts ) => updateCounter({...opts, step: -1});

export const updateCounter = ( opts ) => new Promise((resolve, reject) => {
  const counterTableName = process.env.NODE_ENV === 'test' ? '_test_table_counters' : '_table_counters';
  const { tableName, step } = opts;
  
  if(tableName === undefined) return reject(`updateCounter(): Missing 'tableName'`);
  if(!isNumber(step)) return reject(`updateCounter(): 'step' is not a number.`);
  
  const tableDigest = genTableDigest(tableName);
  
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
        reject(`Error while updating counter for '${tableName}'.`);
      } else {
        resolve(res.Attributes.count);
      }
    })
    .catch(err => reject(`updateCounter(): ${err}`))
});