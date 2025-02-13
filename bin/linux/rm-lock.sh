#!/bin/bash

dir=$(dirname $(dirname $(dirname $(realpath $0))))

rm -rf $dir/.lock/*
