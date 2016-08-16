import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from 'graphql';

import { Contact } from '../contacts/types';
import * as resolvers from './resolvers';

const Organization = new GraphQLObjectType({
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
    contacts: {
      type: new GraphQLList(Contact),
      dependent: 'nullify',
      hasMany: true,
      resolve: (source, args, context) => resolvers.getContacts(source)
    }
  })
});

export { Organization };
