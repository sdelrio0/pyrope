import { TEST_TIMEOUT, dynaliteSetup, dynaliteTeardown } from '../test_helper';

before(function() {
  this.timeout(TEST_TIMEOUT);
  return dynaliteSetup()
});

after(function() {
  this.timeout(TEST_TIMEOUT);
  return dynaliteTeardown()
});