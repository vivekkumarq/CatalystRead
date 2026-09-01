---
title: "Data Fetching and Caching Patterns with TanStack Query"
slug: "react-tanstack-query-data-fetching-patterns"
description: "Practical TanStack Query patterns for query keys, cache invalidation, and optimistic updates that hold up in real React applications."
publishedAt: "2026-05-05"
category: "React"
tags:
  - React
  - TanStack Query
  - Data Fetching
  - Caching
---

Reaching for `useEffect` plus `useState` to fetch data works right up until you need caching, deduplication of simultaneous requests, background refetch on window focus, or retry with backoff — at which point you're rebuilding TanStack Query badly, one `useEffect` at a time. The library's actual complexity lives less in the API surface, which is small, and more in getting query keys and invalidation right.

## Query keys are your cache's schema

Every query is identified by its key, and the key's structure determines what invalidation can target. Flat, unstructured keys like `['user', userId]` work for simple cases but fall apart once you need to invalidate a whole category:

```javascript
// structured keys let you invalidate at different levels of granularity
const userKeys = {
  all: ['users'],
  lists: () => [...userKeys.all, 'list'],
  list: (filters) => [...userKeys.lists(), filters],
  detail: (id) => [...userKeys.all, 'detail', id],
};

useQuery({
  queryKey: userKeys.detail(userId),
  queryFn: () => fetchUser(userId),
});
```

```javascript
// invalidate every user-related query after a mutation that could affect any of them
queryClient.invalidateQueries({ queryKey: userKeys.all });

// invalidate only the list views, leaving cached detail pages alone
queryClient.invalidateQueries({ queryKey: userKeys.lists() });
```

This hierarchy is what makes invalidation precise instead of a blunt "refetch everything" call after every mutation.

## Optimistic updates without losing consistency

For mutations where latency is noticeable — reordering a list, toggling a flag — updating the cache immediately and rolling back on failure keeps the UI responsive without lying about state indefinitely:

```javascript
const mutation = useMutation({
  mutationFn: updateTodo,
  onMutate: async (newTodo) => {
    await queryClient.cancelQueries({ queryKey: ['todos'] });
    const previous = queryClient.getQueryData(['todos']);

    queryClient.setQueryData(['todos'], (old) =>
      old.map(t => (t.id === newTodo.id ? newTodo : t))
    );

    return { previous }; // context for rollback
  },
  onError: (err, newTodo, context) => {
    queryClient.setQueryData(['todos'], context.previous);
  },
  onSettled: () => {
    queryClient.invalidateQueries({ queryKey: ['todos'] });
  },
});
```

`onMutate`'s `cancelQueries` call matters more than it looks — without it, an in-flight background refetch can resolve after your optimistic update and silently overwrite it with stale data.

## staleTime is the setting most people ignore

The default `staleTime` of `0` means every query is considered stale immediately and refetches on every mount and window focus. That's the right default for genuinely live data, but for something like a list of countries or a user's own profile, it causes needless network chatter:

```javascript
useQuery({
  queryKey: ['countries'],
  queryFn: fetchCountries,
  staleTime: 1000 * 60 * 60, // an hour — this data changes rarely
});
```

Setting `staleTime` per query based on how often the underlying data actually changes is a bigger performance lever than most cache-tuning people reach for first, because it directly cuts redundant requests rather than just changing how they're presented.

## Dependent queries

When one query needs the result of another, `enabled` gates execution instead of nesting fetches manually:

```javascript
const { data: user } = useQuery({ queryKey: ['user', id], queryFn: () => fetchUser(id) });

const { data: projects } = useQuery({
  queryKey: ['projects', user?.teamId],
  queryFn: () => fetchProjects(user.teamId),
  enabled: !!user?.teamId,
});
```

This keeps the second query out of the cache and out of any loading state tracking until its dependency is actually satisfied, rather than firing a request you know will fail.
