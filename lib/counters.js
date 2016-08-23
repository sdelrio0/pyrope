/*
import { isNumber } from 'underscore';
import { genTableDigest } from './utils';
import { ddbClient } from './core';
import { COUNTERS_TABLE_NAME } from './actions';

export const increaseCounter = ( opts ) => updateCounter({...opts, step: 1});

export const decreaseCounter = ( opts ) => updateCounter({...opts, step: -1});

export const updateCounter = ( opts ) => new Promise((resolve, reject) => {
  const { fullTableName, step } = opts;

  if(fullTableName === undefined) return reject(`updateCounter(): Missing 'fullTableName'`);
  if(!isNumber(step)) return reject(`updateCounter(): 'step' is not a number.`);

  const counterTableName = (tablePrefix || '') + COUNTERS_TABLE_NAME  + (tableSuffix || '');

  const tableDigest = genTableDigest(fullTableName);

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
  */