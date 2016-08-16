
import PyropeModel from '../../../lib';
import { TransactionType } from '../transactions/types';

export const getTransaction = (source) =>
  new PyropeModel(TransactionType, { table: '_test_transactions' })
    .get({uuid: source.uuid});
