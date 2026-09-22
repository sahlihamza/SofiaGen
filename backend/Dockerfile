FROM node:20
ENV LANG=C.UTF-8
ENV LC_ALL=C.UTF-8

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5055

CMD ["npm", "run", "dev"]
