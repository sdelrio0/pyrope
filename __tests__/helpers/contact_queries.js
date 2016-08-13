export const createContact = (contact) => `
  mutation {
    createContact(
      title: "${contact.title || ''}"
      firstName: "${contact.firstName || ''}"
      middleName: "${contact.middleName || ''}"
      lastName: "${contact.lastName || ''}"
      dateOfBirth: "${contact.dateOfBirth || ''}"
      gender: "${contact.gender || ''}"
      jobTitle: "${contact.jobTitle || ''}"
      jobArea: "${contact.jobArea || ''}"
      emails: [${contact.emails.map(e => '\"'+e+'\"').join(',')}]
      phoneNumbers: [${contact.phoneNumbers.map(e => '\"'+e+'\"').join(',')}]
      addresses: [${contact.addresses.map(e => '\"'+e+'\"').join(',')}]
      
    ) {
      uuid
      title
      firstName
      middleName
      lastName
      dateOfBirth
      gender
      jobTitle
      jobArea
      emails
      phoneNumbers
      addresses
    }
  }
`;
