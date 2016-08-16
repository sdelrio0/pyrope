import PyropeModel from '../../../lib';
import { ContactType } from '../contacts/types';

export const getContact = (source) =>
  new PyropeModel(ContactType, { table: '_test_contacts' })
    .get({uuid: source.uuid});