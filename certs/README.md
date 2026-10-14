# SSL / TLS Certificates Directory

Place your Cloudflare Origin CA certificates here:

- `cert.pem`: The Cloudflare Origin Certificate.
- `key.pem`: The Cloudflare Private Key.

These files are ignored by git to prevent exposing private keys.
They are mounted into the frontend container at `/etc/nginx/certs:ro`.
