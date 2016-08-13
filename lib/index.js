
import { ddb, ddbClient } from './core';
import {
  count, all, take, first, last, findByIndex, create, update, destroy
} from './actions';
import { associate, dissociate, getAssociations } from './associations';

export {
  ddb, ddbClient,
  count, all, take, first, last, findByIndex, create, update, destroy,
  associate, dissociate, getAssociations
};