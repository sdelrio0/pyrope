import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from 'graphql';

import { ContactType } from '../contacts/types';
import * as resolvers from './resolvers';

const OrganizationType = new GraphQLObjectType({
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
      type: new GraphQLList(ContactType),
      dependent: 'nullify',
      hasMany: true,
      resolve: (source, args, context) => resolvers.getContacts(source)
    }
  })
});

export { OrganizationType };
