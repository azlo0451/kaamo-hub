import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';

export async function GET(context: APIContext) {
  const posts = await getCollection('news');
  return rss({
    title: 'The Kaamo Club',
    description: 'Hub announcements and service status updates',
    site: context.site!,
    items: posts
      .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
      .map((post) => ({
        title: post.data.title,
        pubDate: post.data.date,
        description: post.data.summary,
        link: `/news#${post.id}`,
      })),
    customData: '<language>en-us</language>',
  });
}
