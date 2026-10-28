import { PostsService } from './posts.service';
import { slugify } from '../utilities/slugify';

describe('PostsService topics', () => {
  const service = new PostsService();
  const topics = [...service.categories, ...service.tags];
  const listed = new Map(topics.map((topic) => [topic.slug, new Set(service.postsForTopic(topic))]));

  it('lists as many articles on each topic page as its count says', () => {
    for (const topic of topics) {
      expect(listed.get(topic.slug)?.size, topic.slug).toBe(topic.count);
    }
  });

  it('lists every article on the topic page each of its tags links to', () => {
    for (const post of service.posts) {
      for (const tag of post.tags) {
        const slug = service.topicBySlug(slugify(tag))?.slug ?? '';
        expect(listed.get(slug)?.has(post), `${post.slug} -> ${tag}`).toBe(true);
      }
    }
  });
});
