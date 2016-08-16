
import PyropeModel from '../../../lib';
import { OperationType } from '../operations/types';

export const getOperation = (source) =>
  new PyropeModel(OperationType, { table: '_test_operations' })
    .get({uuid: source.uuid});
