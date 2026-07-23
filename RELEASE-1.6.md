# Bite2Eat 1.6.0-alpha.1 — AI Food Studio

## Added
- Generate a photorealistic menu image from each product name, description and category.
- Regenerate an existing product image.
- Bulk-generate images for products that do not yet have a photo.
- Generated PNG files are stored locally in `public/generated-food` and immediately assigned to the product in PostgreSQL.
- Owner/manager authentication protects generation endpoints.

## Configuration
Add `OPENAI_API_KEY` to `.env`. The optional `IMAGE_GENERATION_MODEL` defaults to `gpt-image-1`. Restart the dev server after changing `.env`.

## Local-storage note
The generated files persist in the project folder during local development. A production deployment should replace local filesystem storage with durable object storage such as S3, Cloudflare R2 or Vercel Blob.
