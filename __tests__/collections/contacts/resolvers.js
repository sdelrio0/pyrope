
import { PyropeModel } from '../../../lib';
import { UserType } from '../users/types';
import { OrganizationType } from '../organizations/types';

export const getUser = (source) =>
  new PyropeModel(UserType, { tablePrefix: 'qtz-', tableSuffix: '-test' })
    .get({uuid: source.uuid});

export const getOrganizations = (source) =>
  new PyropeModel(OrganizationType, { tablePrefix: 'qtz-', tableSuffix: '-test' })
    .get({uuid: source.uuid});