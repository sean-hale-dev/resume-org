NODEPM = npm
ifneq (, $(shell which yarn))
	NODEPM = yarn
endif

setup:
	pip3 install pipenv

install_parser:
	setup \
	cd src/resumeParser \
	pipenv install \
	pipenv run pip3 install --editable . \
	pipenv run resumeParser foobar --install \
	cd ../../

install_frontend:
	cd src/client/resume-org \
	$(NODEPM) install \
	cd ../../../

install_backend:
	cd src/server \
	npm install \
	cd ../../

install:
	install_parser install_frontend install_backend


