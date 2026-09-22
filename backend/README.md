sofiagen Server Documentation - Updated backend


Introduction: 

This is ready api backend for sofiagen admin and frontend built with node.js, express, mongoose, and mongodb for database. 


Tech and Packages we use in this project:

    1. Node.js framework Express.js.
    2. Mongodb use for database .
    3. Mongoose for all schema validation and database connection.
    4. JsonwebToken for create jsonwebtoken.
    5. BcryptJs for password encryption.
    6. Day.js for data format.
    7. Dotenv for use environment variable.
    8. Nodemon for run on dev server.
    9. Cors and Body parser

Getting Started & Installation:

For getting started with the template you have to follow the below procedure. First navigate to the sofiagen-server directory.

Step 1 : Configure your .env file:

Within the project directory you'll find a .env.example file just rename it as .env and paste your Mongo_Uri and JWT_SECRET.

Step 2 : Running the project:

    ⦁	First npm install for install all packages latest version.
    ⦁	npm run start:dev for run in development mode.
    ⦁	npm install (first, to install all packages).
    ⦁	npm run dev to run the server in development mode (uses nodemon).
    ⦁	npm run start to run the server in production mode.
    ⦁	npm run data:import to manually import all sample data into your database. This runs src/script/seed.js and all sample data in the utils file will be imported into your database.
    ⦁	npm run seed-permissions to create/update all permissions in the database.
    ⦁	npm run seed-super-admin to create the "Super Admin" role with all permissions.


Folder Structure & Customization:

⦁   In src/index.js you will find all declared api endpoints for the different routes.

⦁   In src/script/seed.js you will find all created models for manually importing data into the database.

⦁   /src/config : This folder contains auth for signInToken, isAdmin and isAuth middleware.

⦁   /src/models: This folder contains all models created with mongoose schema validation.

⦁   /src/routes: This folder contains all routes like admin, category, product, coupon, user, userOrder, etc.

⦁   /src/controller: This folder contains all the different route controllers.

⦁   /src/utils : This folder contains admin, user, product and category sample data.



Configuration & Deployment:

We use heroku for hosting this server if you want to hosting on heroku just follow their documentation, You can also hosting this any other hosting services.