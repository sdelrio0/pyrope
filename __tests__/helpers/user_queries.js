export const signIn = ({username, password}) => `
  mutation {
    user: signIn(
      username: "${username}"
      password: "${password}"
    ) {
      uuid
      username
      hashedPassword
      role
      jwt
      createdAt
      updatedAt 
    }
  }
`;

export const signUp = ({username, password}) => `
  mutation {
    user: signUp(
      username: "${username}"
      password: "${password}"
    ) {
      uuid
      username
      hashedPassword
      role
      jwt
      createdAt
      updatedAt 
    }
  }
`;

export const createUser = ({username, password, role}) => `
  mutation {
    user: createUser(
      username: "${username}"
      password: "${password}"
      role: "${role}"
    ) {
      uuid
      username
      role
      hashedPassword
      createdAt
      updatedAt 
    }
  }
`;

export const getUser = (args) => {
  let index;
  
  if(args.uuid) {
    index = `uuid: "${args.uuid}"`;
  } else {
    index = `username: "${args.username}"`;
  }
  
  return ` 
    query {
      user (
        ${index}
      ) {
        uuid
        username
        hashedPassword
        role
        createdAt
        updatedAt 
      }
    }
  `;
};

// limit, order, cursor
export const getUsers = (opts = {}) => {
  let args = [];
  
  if(opts.order) {
    if(opts.order === 'asc') {
      args.push('order: "asc"')
    } else if (opts.order === 'desc') {
      args.push('order: "desc"')
    }
  }
  
  if(opts.limit) {
    args.push(`limit: ${opts.limit}`)
  }
  
  if(opts.cursor) {
    args.push(`cursor: "${opts.cursor}"`)
  }
  
  args = args.join(',');
  
  return `
    query {
      users${args.length > 0 ? "(" + args + ")" : ""} {
        uuid
        username
        hashedPassword
        role
        cursor
        createdAt
        updatedAt 
      }
    }
  `;
};

export const updateUser = ({uuid, username, password, role}) => `
  mutation {
    user: updateUser (
      uuid: "${uuid}"
      username: "${username}"
      password: "${password}"
      role: "${role}"
    ) {
      uuid
      username
      hashedPassword
      role
      createdAt
      updatedAt 
    }
  }
`;

export const deleteUser = ({uuid}) => `
  mutation {
    user: deleteUser(uuid: "${uuid}") {
      uuid
      username
      hashedPassword
      role
      createdAt
      updatedAt 
    }
  }
`;