import { DynamoDB } from 'aws-sdk';

const config = {
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: process.env.SERVERLESS_REGION || 'us-east1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000'
};

const _ddb = new DynamoDB(config);
const _ddbClient = new DynamoDB.DocumentClient(config);

export const ddb = (method, params) => new Promise((resolve, reject) => {
  try {
    _ddb[method](params, (err, data) => {
      if (err) {
        reject(`ddb(): ${err}`);
      } else {
        resolve(data);
      }
    })
  } catch(err) {
    reject(`ddb(): ${err}`);
  }
});

export const ddbClient = (method, params) => new Promise((resolve, reject) => {
  try {
    _ddbClient[method](params, (err, data) => {
      if (err) {
        reject(`ddbClient(): ${err}`);
      } else {
        resolve(data);
      }
    })
  } catch(err) {
    reject(`ddbClient(): ${err}`);
  }
});