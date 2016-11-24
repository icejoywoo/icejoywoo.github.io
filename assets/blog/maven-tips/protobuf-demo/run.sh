#!/bin/bash

mvn package

java -cp target/protobuf-demo-project-1.0.jar AddPerson address.pb

java -cp target/protobuf-demo-project-1.0.jar ListPeople address.pb
