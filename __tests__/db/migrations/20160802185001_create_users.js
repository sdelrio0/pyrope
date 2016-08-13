var TABLE_NAME = 'users';

TABLE_NAME = `${process.env.NODE_ENV === 'test' ? '_test_' : ''}${TABLE_NAME}`;

module.exports.default = {
  up: {
    method: 'createTable',
    params: {
      AttributeDefinitions: [
        {AttributeName: "uuid", AttributeType: "S"},
        {AttributeName: "username", AttributeType: "S"},
        {AttributeName: "createdAt", AttributeType: "N"},
        {AttributeName: "_table", AttributeType: "S"}
      ],
      TableName: TABLE_NAME,
      KeySchema: [
        {AttributeName: "uuid", KeyType: "HASH"},
        {AttributeName: "createdAt", KeyType: "RANGE"}
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "_tableIndex",
          KeySchema: [
            {AttributeName: "_table", KeyType: "HASH"},
            {AttributeName: "createdAt", KeyType: "RANGE"}
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
        },
        {
          IndexName: "uuidIndex",
          KeySchema: [
            {AttributeName: "uuid", KeyType: "HASH"},
            {AttributeName: "createdAt", KeyType: "RANGE"}
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
        },
        {
          IndexName: "usernameIndex",
          KeySchema: [
            {AttributeName: "username", KeyType: "HASH"},
            {AttributeName: "createdAt", KeyType: "RANGE"}
          ],
          Projection: {
            ProjectionType: "ALL"
          },
          ProvisionedThroughput: {
            ReadCapacityUnits: 1,
            WriteCapacityUnits: 1
          }
        }
      ],
      ProvisionedThroughput: {
        ReadCapacityUnits: 1,
        WriteCapacityUnits: 1
      }
    }
  },
  
  down: {
    method: 'deleteTable',
    params: {
      TableName: TABLE_NAME
    }
  }
};