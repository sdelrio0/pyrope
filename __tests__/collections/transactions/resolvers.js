
import { PyropeModel } from '../../../lib';
import { OperationType } from '../operations/types';

export const getOperation = (source) =>
  new PyropeModel(OperationType, { tablePrefix: 'qtz-', tableSuffix: '-test' })
    .get({uuid: source.uuid});
