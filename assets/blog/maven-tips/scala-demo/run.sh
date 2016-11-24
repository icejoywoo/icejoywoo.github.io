#!/bin/bash

mvn package

java -cp target/scala-demo-project-1.0.jar HelloWorld
