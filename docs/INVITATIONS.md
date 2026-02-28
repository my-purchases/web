# Invitations

Invitations are JSON files that contain provider API credentials and metadata. They are the only way to authenticate and connect API providers in My Resources.

## Structure

```json
{
  "code": "my-invite",
  "label": "My Invitation",
  "description": "Personal API credentials",
  "providers": {
    "allegro": {
      "clientId": "your-client-id",
      "clientSecret": "your-client-secret",
      "accessToken": "initial-access-token",
      "refreshToken": "initial-refresh-token",
      "proxyUrl": "https://your-cors-proxy.example.com"
    }
  },
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

## Fields

| Field | Required | Description |
|-------|----------|-------------|
| `code` | Yes | Unique identifier used to load the invitation |
| `label` | Yes | Display name shown in the UI |
| `description` | No | Optional description |
| `providers` | Yes | Map of provider ID → credentials object |
| `expiresAt` | No | ISO 8601 expiration date |

## Loading Methods

### By Code

Place the invitation file at `public/invitations/{code}.json`. Users enter the code in the welcome screen and the app fetches it.

### By File Import

Users can import an invitation `.json` file directly from their device. This is useful for distributing credentials privately without hosting them.

### Demo Code

The built-in `demo` code loads `public/invitations/demo.json` which contains placeholder credentials for exploration.

## Security Notes

- Credentials are stored in the browser's localStorage after loading
- The invitation file should only be shared with trusted users
- For API providers like Allegro, tokens will be refreshed automatically
- Consider setting `expiresAt` to limit the lifetime of shared credentials
- Never commit real credentials to a public repository
