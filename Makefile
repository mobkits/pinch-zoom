build:
	@open http://localhost:3000/example/index.html
	@gulp

test:
	@open http://localhost:8080/bundle
	@gulp webpack:test

test-karma:
	@node_modules/.bin/karma start --single-run

test-coveralls:
	@echo TRAVIS_JOB_ID $(TRAVIS_JOB_ID)
	@node_modules/.bin/karma start --single-run && \
		cat ./coverage/lcov/lcov.info | ./node_modules/coveralls/bin/coveralls.js

doc:
	@ghp-import example -n -p

.PHONY: test
