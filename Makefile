MAKEFLAGS += -j3

NODEPM = npm
ifneq (, $(shell which yarn))
	NODEPM = yarn
endif

.PHONY: install install_production run clean install_parser install_parser_novenv install_server install_frontend start_frontend start_server fresh clean_node clean_parser

install_parser:
	cd src/server/utils/parser && export SYSTEM_VERSION_COMPAT=1 && pipenv install && pipenv run resumeParser foobar --install

install_parser_novenv:
	cd src/server/utils/parser && pip3 install -r requirements.txt && pip3 install --user --editable .

install_server:
	cd src/server && $(NODEPM) install

install_frontend:
	cd src/client && $(NODEPM) install

start_frontend:
	cd src/client && $(NODEPM) start

start_server:
	cd src/server && $(NODEPM) start

install: install_parser install_frontend install_server

install_production: install_parser_novenv install_frontend install_server

run: start_frontend start_server

clean_node:
	find . -type d -name "node_modules" -exec rm -rf {} \;

clean_parser:
	cd src/server/utils/parser && pipenv --rm

clean: clean_node clean_parser

