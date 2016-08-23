#!/bin/bash
source .env.test && mocha --compilers js:babel-core/register --require ./__tests__/test_helper.js --recursive ./__tests__/tests