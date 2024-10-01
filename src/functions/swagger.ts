import { readFileSync } from "fs"

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
exports.handler = async (event: any) => {
    console.log(`path: ${event.path}`)
    if (event.path === "/api-docs") {
        return {
            statusCode: 200,
            headers: {
                "content-type": "application/json"
            },
            body: readFileSync(__dirname + "/swagger.json", { encoding: "utf8", flag: "r" })
        }
    }

    const body = `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <title>verification service</title>
            <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@3/swagger-ui.css">
        </head>
        <body>
            <div id="swagger"></div>
            <script src="https://unpkg.com/swagger-ui-dist@3/swagger-ui-bundle.js"></script>
            <script>
              SwaggerUIBundle({
                dom_id: '#swagger',
                url: '/api-docs'
            });
            </script>
        </body>
        </html>`

    return {
        statusCode: 200,
        headers: {
            ["Content-Type"]: "text/html"
        },
        body
    }
}
