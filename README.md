### Sushi Go

woohoo

## to run the client

from the client/ directory run `npm start`

## to run the server

from the server/ directory run `npm start`

## to run with the server locally

make sure in client/src/components/Game/Game.js you comment ouy line 32 and uncomment line 31 which sends `ENDPOINT` to localhost:5000

## to deploy the frontend

first run `npm run build`

then copy the `_redirects` file and paste it into the build/ directory (this is needed for Netlify redirects)

then run `netlify deploy` and when it asks which folder say `./build`

then run `netlify deploy --prod` also for the `./build` folder

## to deploy the backend

commit the code and run `git push heroku master`
