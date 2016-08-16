import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from 'graphql';

import { ContactType } from '../contacts/types';
import * as resolvers from './resolvers';

const TransactionType = new GraphQLObjectType({
  name: 'Organization',
  description: 'An organization, business entity, etc.',
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
      type: new GraphQLList(ContactType),
      dependent: 'destroy', // destroy all transactions when the operation is deleted
      hasMany: false,
      resolve: (source, args, context) => resolvers.getOperation(source)
    }
  })
});

export { TransactionType };
