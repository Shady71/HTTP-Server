const net = require('net');

const server = net.createServer((socket) => {
    console.log('A client connected.');

    socket.on('data', (data) => {
        console.log('Received\n' + data.toString());
    });

    socket.on('end', () => {
        console.log('client disconnected.');
    });
});

server.listen(3000, () => {
    console.log('Server listening on port 3000');
});