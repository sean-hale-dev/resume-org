NODEPM = npm
ifneq (, $(shell which yarn))
	NODEPM = yarn
endif

setup:
	pip3 install pipenv

install_parser:
	make setup
	cd src/resumeParser && pipenv install && pipenv run pip3 install --editable . && pipenv run resumeParser foobar --install

install_frontend:
	cd src/client/resume-org && $(NODEPM) install

install_backend:
	cd src/server && $(NODEPM) install

install:
	make install_parser
	make install_frontend
	make install_backend

frontend_dev:
	cd src/client/resume-org && $(NODEPM) start

backend_dev:
	cd src/server && $(NODEPM) start
