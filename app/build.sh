#!/bin/sh

cd `dirname $0`
cd ../
git stash
git pull --rebase
git stash apply

cd client
npm i && npm run build

cd ../server
npm i

cd ../app
npm i && npm run package

