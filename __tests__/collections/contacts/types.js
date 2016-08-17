import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from 'graphql';

import { UserType } from '../users/types';
import { OrganizationType } from '../organizations/types';
import * as resolvers from './resolvers';

const ContactType = new GraphQLObjectType({
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
      type: UserType,
      hasMany: false,
      dependent: 'nullify',
      resolve: (source, args, context) => resolvers.getUser(source)
    },
    organizations: {
      type: new GraphQLList(OrganizationType),
      hasMany: true,
      resolve: (source, args, context) => resolvers.getOrganizations(source)
    }
  })
});

export { ContactType };
