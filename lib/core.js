import { DynamoDB } from 'aws-sdk';
import { unescape } from 'underscore';

const config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID  || "XXXXXXXXXXXXXXXXXX",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "YYYYYYYYYYYYYYYYYYYYYYYYYYYY",
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.AWS_DYNAMODB_ENDPOINT || 'http://localhost:8000'
};

const _ddb = new DynamoDB(config);
const _ddbClient = new DynamoDB.DocumentClient(config);

export const ddb = (method, params) => new Promise((resolve, reject) => {
  try {
    _ddb[method](params, (err, data) => {
      if (err) {
        reject(`ddb(${method}): ${err}, params: ${unescape(JSON.stringify(params))}`);
      } else {
        resolve(data);
      }
    })
  } catch(err) {
    reject(`ddb(${method}): ${err}, params: ${unescape(JSON.stringify(params))}`);
  }
});

export const ddbClient = (method, params) => new Promise((resolve, reject) => {
  try {
    _ddbClient[method](params, (err, data) => {
      if (err) {
        reject(`ddbClient(${method}): ${err}, params: ${unescape(JSON.stringify(params))}`);
      } else {
        resolve(data);
      }
    })
  } catch(err) {
    reject(`ddbClient(${method}): ${err}, params: ${unescape(JSON.stringify(params))}`);
  }
});