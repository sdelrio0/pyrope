
import PyropeModel from '../../../lib';
import { UserType } from '../users/types';
import { OrganizationType } from '../organizations/types';

export const getUser = (source) =>
  new PyropeModel(UserType, { table: '_test_users' })
    .get({uuid: source.uuid});

export const getOrganizations = (source) =>
  new PyropeModel(OrganizationType, { table: '_test_organizations' })
    .get({uuid: source.uuid});