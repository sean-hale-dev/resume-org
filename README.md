# resume-org
Resume cataloguing system designed for RPI's ITWS 4310 MITR class for ECS Technology

## This is the primary development branch

## Using the Makefile
This project comes equipted with a Makefile which allows the project to be installed and configured via `make <target>`.
Here are the availible commands:
- `install`: Installs necesary packages for the frontend, server, and parser ( Note that this requires pipenv to be installed )
	- `install_production`: Installs necesary packages for the frontend, server, and parser ( does not install tp a venv )
	- `install_parser`: Installs the packages and environment for the resumeParser
	- `install_parser_novenv`: Installs the packages for the resumeParser to the global python environment
	- `install_server`: Installs the packages for the API server
	- `install_frontend`: Installs the packages for the frontend site
- `clean`: Removes `node_modules` directory and installed parser venv
	- `clean_node`: Removes the project `node_modules` directories from the project
	- `clean_parser`: Removes the environment for the resumeParser
- `fresh`: Performs a `clean` and then an `install`
- `run`: Starts the development server for the frontend and the API server
	- `start_frontend`: Starts the development server for the frontend site
	- `start_server`: Starts the API server

These commands should be run at the root directory of this project
