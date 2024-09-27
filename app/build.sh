#!/bin/sh

cd `dirname $0`
appDir = `pwd`
cd ../
git stash
git pull --rebase

cd client
npm i && npm run build

cd ../server
npm i

cd app
npm i && npm run package
