# Bifrost

Bifrost is a proxy API built with Bun.

To install dependencies:

```bash
bun install
```

To run:

```bash
bun dev # Development with hot-reload
```

## How-to-use

### Creating a Bifrost route

To create a new Bifrost route you can use the `/bifrost` endpoint:

```bash
curl --request POST \
  --url http://localhost:3000/bifrost/post/github/profiles \
  --header 'Content-Type: application/json' \
  --data '{
	"authorization": "Bearer 123",
	"routes": [
		{
			"url": "https://api.github.com/users/<%username-1%>",
			"method": "get"
		},
		{
			"url": "https://api.github.com/users/<%username-2%>",
			"method": "get"
		}
	]
}'
```

The section right after `/bifrost/` specifies the HTTP method. After that, you can specify the route you want to create.

In this case, we are creating a `POST /github/profiles` endpoint with a Bearer token authorization that will fetch two routes:

- `GET https://api.github.com/users/<%username-1%>`
- `GET https://api.github.com/users/<%username-2%>`

The `<%username-1%>` and `<%username-2%>` are placeholders that will be replaced by the values passed in the request body.

Along with the url and method, you can also specify a body and headers for each route.

### Calling a Bifrost route

You can then call the route you just created:

```bash
curl --request POST \
  --url http://localhost:3000/github/profiles \
  --header 'Authorization: Bearer 123' \
  --header 'Content-Type: application/json' \
  --data '{
	"username-1": "nunogois",
	"username-2": "<your-github-username>"
}'
```

The routes will be called sequentially by default. You'll receive a response that includes the routes that were called and their respective responses.
