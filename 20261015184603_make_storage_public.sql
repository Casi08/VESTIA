/*
# Make clothing-photos bucket public

The clothing-photos bucket was created as private. Making it public so that
image URLs returned to the client are directly loadable in Image components.
*/

UPDATE storage.buckets SET public = true WHERE id = 'clothing-photos';