import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from 'graphql';

import { Contact } from '../contacts/types';
import * as resolvers from './resolvers';

const Transaction = new GraphQLObjectType({
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
      type: new GraphQLList(Contact),
      dependent: 'destroy', // destroy all transactions when the operation is deleted
      hasMany: false,
      resolve: (source, args, context) => resolvers.getOperation(source)
    }
  })
});

export { Transaction };
