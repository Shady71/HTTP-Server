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

const server = net.createServer((socket) => {
    console.log('A client connected.');

    socket.on('data', (data) => {
        const request = parseRequest(data);
        console.log(request);
    });

    socket.on('end', () => {
        console.log('client disconnected.');
    });
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});