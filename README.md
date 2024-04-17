# Fullstack Typescript - Backend Template
A template for a TypeScript backend. Designed to work with the [Frontend Template.](https://github.com/endulum/ts-frontend-template)

## Behavior
This template comes with a User object model and controller, and endpoints for user authorization, creation, and editing. Users can create and log into accounts, being able to access protected routes using the token given to them from the `/login` route. Users can change their own details - in this template currently their only details are their username and password - and view one another's profiles.

## Technologies
- Express as the server framework
- MongoDB as the server database
- Style enforced with ESLint ("Standard with TypeScript")
- Functionality enforced with Jest + Supertest testing
