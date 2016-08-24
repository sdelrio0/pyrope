import { DynamoDB } from 'aws-sdk';

const config = {
  accessKeyId: process.env.AWS_ACCESS_KEY_ID  || "XXXXXXXXXXXXXXXXXX",
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "YYYYYYYYYYYYYYYYYYYYYYYYYYYY",
  sessionToken: process.env.AWS_SESSION_TOKEN,
  region: process.env.AWS_REGION,
  endpoint: process.env.AWS_DYNAMODB_ENDPOINT
};

const _ddb = new DynamoDB(config);
const _ddbClient = new DynamoDB.DocumentClient(config);

export const ddb = (method, params) => new Promise((resolve, reject) => {
  try {
    _ddb[method](params, (err, data) => {
      if (err) {
        console.error(`DynamoDB[${method}]: ${err}, params: ${JSON.stringify(params)}`);
        reject(`DynamoDB[${method}]: ${err}, params: ${JSON.stringify(params)}`);
      } else {
        resolve(data);
      }
    })
  } catch(err) {
    console.error(`DynamoDB[${method}]: ${err}, params: ${JSON.stringify(params)}`);
    reject(`DynamoDB[${method}]: ${err}, params: ${JSON.stringify(params)}`);
  }
});

export const ddbClient = (method, params) => new Promise((resolve, reject) => {
  try {
    _ddbClient[method](params, (err, data) => {
      if (err) {
        console.error(`DynamoDBClient[${method}]: ${err}, params: ${JSON.stringify(params)}`);
        reject(`DynamoDBClient[${method}]: ${err}, params: ${JSON.stringify(params)}`);
      } else {
        resolve(data);
      }
    })
  } catch(err) {
    console.error(`DynamoDBClient[${method}]: ${err}, params: ${JSON.stringify(params)}`);
    reject(`DynamoDBClient[${method}]: ${err}, params: ${JSON.stringify(params)}`);
  }
});