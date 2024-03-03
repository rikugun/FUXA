FROM node:18 as builder

# Workaround for sqlite3 https://stackoverflow.com/questions/71894884/sqlite3-err-dlopen-failed-version-glibc-2-29-not-found
RUN apt-get update && apt-get install -y sqlite3 libsqlite3-dev

WORKDIR /fuxa
ADD . /fuxa/
WORKDIR /fuxa/client
RUN npm install --legacy-peer-deps && npm run build

WORKDIR /fuxa/server
RUN npm install --build-from-source --sqlite=/usr/bin sqlite3


FROM node:18
RUN apt-get update && apt-get install -y sqlite3 libsqlite3-dev && \
    apt-get autoremove -yqq --purge && \
    apt-get clean  && \
    rm -rf /var/lib/apt/lists/*

COPY --from=builder /fuxa/server /fuxa/server
COPY --from=builder /fuxa/client/dist /fuxa/client/dist

WORKDIR /fuxa/server
EXPOSE 1881
ENTRYPOINT [ "npm", "start" ]