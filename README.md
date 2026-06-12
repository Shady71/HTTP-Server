# HTTP-Server
An HTTP server framework built using Node's `net` module (plus the built-in `fs` and `path` for file serving).

Server starts on port 3000.

## How to run

Run the server with: node server.js

## The main idea

The main API design choice is that handlers do not receive a `res` object. Instead, they return a value and the framework figures out what HTTP response it should become:

- return a string → sent as plain text (200)
- return an object → sent as JSON (200)
- return `{_status: 201, body: {...}}` → JSON with a custom status code
- return `{_file: 'public/test.html'}` → that file gets served from disk

The `interpret` function does the following: It checks the type of whatever the handler returned and builds the right response. It keeps handlers short, and it makes mistakes like forgetting to send a response less likely because the framework handles the final response in one place.

The `_` prefix on `_status` / `_file` is to avoid conflict with real data.

## The Methods

- `parseRequest`: turns the raw request text into `{method, path, query, headers, body}`. Headers are lowercased and split at the first colon so values like `localhost:3000` don't get cut.
- `sendResponse`: builds the status line, headers, and body. Content-Length is counted in bytes (`Buffer.byteLength`), not characters, since multi-byte characters would break it otherwise.
- `createRouter`: stores routes by method and path, matches them segment by segment. Segments starting with `:` are parameters, so `/users/:id` matches `/users/42` and gives you `request.params.id`.
- `serveFile`: serves files from `public/` with the right Content-Type based on the extension. It resolves the path first and rejects anything that escapes the public folder.

## Extra features

1. **Automatic JSON body parsing**: if a request has `Content-Type: application/json`, the body is parsed before the handler runs, so `request.body` is already an object.
2. **Request logging with timing**: every request prints something like `GET /users/42 (1ms)` to the terminal.

## Demo routes

- `GET /`: plain text.
- `GET /users/:id`: params + JSON response.
- `POST /users`: returns 201, echoes the parsed JSON body.
- `GET /home`: serves `public/test.html` from disk.
- `GET /static/:filename`: serves any file from `public/`.