const net = require('net');

function parseRequest(data) {
    const text = data.toString();
    const lines = text.split('\r\n');
    const requestLine = lines[0].split(' ');
    const method = requestLine[0];
    const fullPath = requestLine[1];
    const version = requestLine[2];

    const [path, queryString] = fullPath.split('?');
    const query = {};
    if (queryString) {
        for (const pair of queryString.split('&')) {
            const [key, value] = pair.split('=');
            query[decodeURIComponent(key)] = decodeURIComponent(value || '');
        }
    }

    const headers = {};
    let i = 1;
    for (; i < lines.length; i++) {
        const line = lines[i];
        if (line === '') break; // End of headers
        const colon = line.indexOf(':');
        const key = line.slice(0, colon).toLowerCase().trim();
        const value = line.slice(colon + 1).trim();
        headers[key] = value;
    }

    const body = lines.slice(i + 1).join('\r\n');

    return {method, path, query, headers, body, version};
}

function sendResponse(socket, statusCode, headers, body) {
    const statusMessage = {
        200: 'OK',
        201: 'Created',
        400: 'Bad Request',
        404: 'Not Found',
        500: 'Internal Server Error'
    }[statusCode] || 'Unknown';

    headers['Content-Length'] = Buffer.byteLength(body);
    headers['Connection'] = 'close';

    const responseLines = [
        `HTTP/1.1 ${statusCode} ${statusMessage}`,
        ...Object.entries(headers).map(([key, value]) => `${key}: ${value}`),
        '',
        body
    ];

    socket.write(responseLines.join('\r\n'));
    socket.end();
}

function createRouter() {
    const routes = {};

    function addRoute(method, path, handler) {
        if (!routes[method]) {
            routes[method] = {};
        }
        routes[method][path] = handler;
    }

    function getHandler(method, path) {
        const methodRoutes = routes[method];

        if (!methodRoutes) return null;
        
        for (const pattern in methodRoutes) {
            const patternParts = pattern.split('/');
            const pathParts = path.split('/');

            if (patternParts.length !== pathParts.length) continue;

            const params = {};
            let isMatch = true;

            for (let i = 0; i < patternParts.length; i++) {
                if (patternParts[i].startsWith(':')) {
                    const name = patternParts[i].slice(1);
                    params[name] = pathParts[i];
                } else if (patternParts[i] !== pathParts[i]) {
                    isMatch = false;
                    break;
                }
            }
            if (isMatch) {
                return { handler: methodRoutes[pattern], params };
            }
        }
        return null;
    }
    return {addRoute, getHandler};
}

function createApp() {
    const router = createRouter();

    function interpret(socket, result) {
        if (typeof result === 'string') {
            sendResponse(socket, 200, { 'Content-Type': 'text/plain' }, result);
        } else if (result && typeof result === 'object') {
            if (result._status || result._type) {
                const status = result._status || 200;
                if (result._type === 'text') {
                    sendResponse(socket, status, { 'Content-Type': 'text/plain' }, result.body);
                } else {
                    sendResponse(socket, status, { 'Content-Type': 'application/json' }, JSON.stringify(result.body));
                }
            } else {
                sendResponse(socket, 200, { 'Content-Type': 'application/json' }, JSON.stringify(result));
            }
        } else {
            sendResponse(socket, 500, { 'Content-Type': 'text/plain' }, 'Handler returned nothing');
        }
    }

    function handleRequest(request, socket) {
        const matched = router.getHandler(request.method, request.path);
        if (!matched) {
            sendResponse(socket, 404, { 'Content-Type': 'text/plain' }, 'Not Found');
            return;
        }
        request.params = matched.params;
        const result = matched.handler(request);
        interpret(socket, result);
    }

    const app = {
        get: (path, handler) => router.addRoute('GET', path, handler),
        post: (path, handler) => router.addRoute('POST', path, handler),
        listen: (port, callback) => {
            const server = net.createServer((socket) => {
                socket.on('data', (data) => {
                    const req = parseRequest(data);
                    console.log(`${req.method} ${req.path}`);
                    handleRequest(req, socket);
                });
                socket.on('error', (err) => console.error('Socket error:', err.message));
            });
            server.listen(port, callback);
        }
    };
    return app;
}

const app = createApp();

app.get('/', () => 'Server is running.');

app.get('/users/:id', (request) => ({ id: request.params.id, name: 'User ' + request.params.id }));

app.post('/users', (request) => ({
    _status: 201,
    body: { created: true, received: request.body }
}));

app.listen(3000, () => {
    console.log('Server listening on port 3000');
});
