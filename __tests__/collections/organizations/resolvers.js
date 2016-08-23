
import { PyropeModel } from '../../../lib';
import { ContactType } from '../contacts/types';

export const getContacts = (source) =>
  new PyropeModel(ContactType, { tablePrefix: 'qtz-', tableSuffix: '-test' })
    .get({uuid: source.uuid});
