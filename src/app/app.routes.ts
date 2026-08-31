import { Routes } from '@angular/router';
import { articleContentResolver } from './features/articles/article-content.resolver';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home').then((m) => m.Home),
  },
  {
    path: 'articles',
    loadComponent: () => import('./features/articles/article-list').then((m) => m.ArticleList),
  },
  {
    path: 'articles/:slug',
    loadComponent: () => import('./features/articles/article-detail').then((m) => m.ArticleDetail),
    resolve: { content: articleContentResolver },
  },
  {
    path: 'topics',
    loadComponent: () => import('./features/topics/topic-index').then((m) => m.TopicIndex),
  },
  {
    path: 'topics/:slug',
    loadComponent: () => import('./features/topics/topic-detail').then((m) => m.TopicDetail),
  },
  {
    path: 'search',
    loadComponent: () => import('./features/search/search-page').then((m) => m.SearchPage),
  },
  {
    path: 'about',
    loadComponent: () => import('./features/about/about').then((m) => m.About),
  },
  {
    path: 'contribute',
    loadComponent: () => import('./features/contribute/contribute').then((m) => m.Contribute),
  },
  {
    path: '404',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
  {
    path: '**',
    loadComponent: () => import('./features/not-found/not-found').then((m) => m.NotFound),
  },
];
