FROM node:18-bookworm

ARG NODE_SNAP=false
ARG USE_ODBC=false

# Change working directory
WORKDIR /usr/src/app


RUN if [ "USE_ODBC" = "true" ]; then \
    apt-get update && apt-get install -y dos2unix; \
    git clone https://github.com/frangoteam/FUXA.git; \
    apt-get install -y build-essential unixodbc unixodbc-dev; \
    dos2unix FUXA/odbc/install_odbc_drivers.sh && chmod +x FUXA/odbc/install_odbc_drivers.sh; \
    cd /usr/src/app/FUXA/odbc && ./install_odbc_drivers.sh; \
    cp /usr/src/app/FUXA/odbc/odbcinst.ini /etc/odbcinst.ini; \
    fi


# Workaround for sqlite3 https://stackoverflow.com/questions/71894884/sqlite3-err-dlopen-failed-version-glibc-2-29-not-found
RUN apt-get update && apt-get install -y sqlite3 libsqlite3-dev && \
    apt-get autoremove -yqq --purge && \
    apt-get clean  && \
    rm -rf /var/lib/apt/lists/*  && \
    npm install --build-from-source --sqlite=/usr/bin sqlite3

# Install Fuxa server
WORKDIR /usr/src/app/FUXA/server
RUN npm install

# Install options snap7
RUN if [ "$NODE_SNAP" = "true" ]; then \
    npm install node-snap7; \
    fi

RUN if [ "USE_ODBC" = "true" ]; then \
    npm i odbc; \
    fi

# Add project files
ADD . /usr/src/app/FUXA

# Set working directory
WORKDIR /usr/src/app/FUXA/server

# Expose port
EXPOSE 1881

# Start the server
CMD [ "npm", "start" ]
