FROM node:18-alpine
WORKDIR /usr/app
COPY package.json .
COPY . .
RUN yarn install
