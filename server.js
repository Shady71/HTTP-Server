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

    return { method, path, query, headers, body, version };
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

const server = net.createServer((socket) => {
    console.log('A client connected.');

    socket.on('data', (data) => {
        const request = parseRequest(data);
        console.log(`${request.method} ${request.path}`);
        sendResponse(socket, 200, { 'Content-Type': 'text/plain' }, 'Hello, World!');
    });

    socket.on('end', () => {
        console.log('client disconnected.');
    });
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});