var TABLE_NAME = 'table_counters';

TABLE_NAME = `${process.env.NODE_ENV === 'test' ? '_test_' : ''}${TABLE_NAME}`;

module.exports.default = {
  up: {
    method: 'createTable',
    params: {
      AttributeDefinitions: [
        {AttributeName: "tableDigest", AttributeType: "S"}
      ],
      TableName: TABLE_NAME,
      KeySchema: [
        {AttributeName: "tableDigest", KeyType: "HASH"}
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: "tableDigestIndex",
          KeySchema: [
            {AttributeName: "tableDigest", KeyType: "HASH"}
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