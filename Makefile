all:
	@find src -name '*.coffee'|xargs -t  coffee -c -l -b -o lib && echo "ok"

.PHONY: test

test:
	@find test/src -name '*.coffee' | xargs -t coffee -c -l -b -o test && echo "ok"
	@find test -name '*.js' | xargs node

clean:
	rm -rf lib
	rm -rf test/*.js