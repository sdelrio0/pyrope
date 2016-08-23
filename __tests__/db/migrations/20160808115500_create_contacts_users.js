var TABLE_NAME = 'qtz-contacts_users';

TABLE_NAME = `${TABLE_NAME}${process.env.NODE_ENV ? '-' + process.env.NODE_ENV : ''}`;

module.exports.default = {
  up: {
    method: 'createTable',
    params: {
      AttributeDefinitions: [
        {AttributeName: "uuid", AttributeType: "S"},
        {AttributeName: "contact", AttributeType: "S"},
        {AttributeName: "user", AttributeType: "S"},
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
          IndexName: "contactIndex",
          KeySchema: [
            {AttributeName: "contact", KeyType: "HASH"},
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
          IndexName: "userIndex",
          KeySchema: [
            {AttributeName: "user", KeyType: "HASH"},
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