import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from 'graphql';

import { User } from '../users/types';
import { Organization } from '../organizations/types';
import * as resolvers from './resolvers';

const Contact = new GraphQLObjectType({
  name: 'Contact',
  description: 'A person\'s contact. It stores information about a person.',
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
    user: {
      type: User,
      hasMany: false,
      dependent: 'nullify',
      resolve: (source, args, context) => resolvers.getUser(source)
    },
    organizations: {
      type: new GraphQLList(Organization),
      hasMany: true,
      resolve: (source, args, context) => resolvers.getOrganizations(source)
    }
  })
});

export { Contact };
