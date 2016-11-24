#!/bin/bash

mvn package

spark-submit --class SparkScalaDemo --master "local[2]" target/spark-demo-project-1.0.jar
spark-submit --class SparkJavaDemo --master "local[2]" target/spark-demo-project-1.0.jar
