import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from 'graphql';

import { OperationType } from '../operations/types';
import * as resolvers from './resolvers';

const TransactionType = new GraphQLObjectType({
  name: 'Transaction',
  description: 'A transaction',
  fields: () => ({
    uuid: {
      type: new GraphQLNonNull(GraphQLString),
    },
    createdAt: {
      type: GraphQLString,
    },
    updatedAt: {
      type: GraphQLString,
    },
    operation: {
      type: new GraphQLList(OperationType),
      dependent: 'nullify', // destroy all transactions when the operation is deleted
      hasMany: false,
      resolve: (source, args, context) => resolvers.getOperation(source)
    }
  })
});

export { TransactionType };
