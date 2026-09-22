import { describe, expect, it } from 'vitest';
import { getGalleryImages, buildGalleryPayload } from './gallery';

describe('gallery helpers', () => {
  it('places the primary image first when gallery items are objects', () => {
    const gallery = [
      { image: '/secondary-1.jpg', isPrimary: false, order: 1 },
      { image: '/primary.jpg', isPrimary: true, order: 0 },
      { image: '/secondary-2.jpg', isPrimary: false, order: 2 },
    ];

    expect(getGalleryImages(gallery)).toEqual(['/primary.jpg', '/secondary-1.jpg', '/secondary-2.jpg']);
  });

  it('builds payload with the primary image first and rest as secondary entries', () => {
    const payload = buildGalleryPayload('/primary.jpg', ['/secondary-1.jpg', '/secondary-2.jpg']);

    expect(payload).toEqual([
      { image: '/primary.jpg', isPrimary: true, order: 0 },
      { image: '/secondary-1.jpg', isPrimary: false, order: 1 },
      { image: '/secondary-2.jpg', isPrimary: false, order: 2 },
    ]);
  });
});
