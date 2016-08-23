
import { PyropeModel } from '../../../lib';
import { TransactionType } from '../transactions/types';

export const getTransaction = (source) =>
  new PyropeModel(TransactionType, { tablePrefix: 'qtz-', tableSuffix: '-test' })
    .get({uuid: source.uuid});
