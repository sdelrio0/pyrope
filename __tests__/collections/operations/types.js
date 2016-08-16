import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from 'graphql';

import { Transaction } from '../transactions/types';
import * as resolvers from './resolvers';

const Operation = new GraphQLObjectType({
  name: 'Operation',
  description: '',
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
    transactions: {
      type: new GraphQLList(Transaction),
      dependent: 'nullify', // dissociate when a transaction is deleted
      hasMany: true,
      resolve: (source, args, context) => resolvers.getTransactions(source)
    }
  })
});

export { Operation };
