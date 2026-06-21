# Thin wrapper so `make <target>` works from /Users/avialurie/sdk too.
# All real targets live in controlkit/Makefile.

TARGETS := help up down status db backend portal install migrate seed reset psql

.PHONY: $(TARGETS)

$(TARGETS):
	@$(MAKE) -C controlkit $@

.DEFAULT_GOAL := help
