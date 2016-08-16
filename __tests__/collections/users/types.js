import {
  GraphQLObjectType,
  GraphQLString,
  GraphQLNonNull,
  GraphQLList,
  GraphQLInt
} from 'graphql';

import { Contact } from '../contacts/types';
import * as resolvers from './resolvers';

const User = new GraphQLObjectType({
  name: 'User',
  description: 'A user in the system.',
  fields: () => ({
    uuid: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'A unique string to identify a user.',
    },
    username: {
      type: new GraphQLNonNull(GraphQLString),
      description: 'The username',
    },
    role: {
      type: GraphQLString,
      description: 'The permission role the user belongs to.',
    },
    hashedPassword: {
      type: GraphQLString,
      description: 'The hashed password to authenticate the user.',
    },
    jwt: {
      type: GraphQLString,
      description: 'The JSON Web Token.',
    },
    createdAt: {
      type: GraphQLString,
    },
    updatedAt: {
      type: GraphQLString,
    },
    cursor: {
      type: GraphQLString,
    },
    contact: {
      type: Contact,
      description: 'Associated contact to the user.',
      dependent: 'destroy', // destroy/nullify
      hasMany: false,
      resolve: (source, args, context) => resolvers.getContact(source) // TODO: Check authorize fn here.
    }
  })
});

export { User };