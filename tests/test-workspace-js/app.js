const express = require('express');
const app = express();

var port = 3000; // Conflict: var usage

function startServer() {
    app.listen(port, () => {
        console.log(\`Server running at http://localhost:\${port}\`);
    });
}

class Service {
    constructor() {}
    process() {}
}

startServer();
