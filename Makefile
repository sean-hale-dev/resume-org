MAKEFLAGS += -j3

NODEPM = npm
ifneq (, $(shell which yarn))
	NODEPM = yarn
endif

install:
	install_parser install_frontend install_server

run:
	start_frontend start_server

.PHONY: clean
clean:
	find . -name "node_modules" -delete && cd src/server/utils/parser && pipenv rm

.PHONY: install_parser
install_parser:
	cd src/server/utils/parser && export SYSTEM_VERSION_COMPAT=1 && pipenv install && pipenv run resumeParser foobar --install

.PHONY: install_server
install_server:
	cd src/server && $(NODEPM) install

.PHONY: install_frontend
install_frontend:
	cd src/client && $(NODEPM) install

.PHONY: start_frontend
start_frontend:
	cd src/client && $(NODEPM) start

.PHONY: start_server
start_server:
	cd src/server && $(NODEPM) start

