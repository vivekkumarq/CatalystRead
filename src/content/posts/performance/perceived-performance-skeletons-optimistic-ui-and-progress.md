---
title: "Perceived Performance: Skeletons, Optimistic UI, and Progress"
slug: "perceived-performance-skeletons-optimistic-ui-and-progress"
description: "Why the fastest-feeling apps aren't always the fastest apps, and how skeletons, optimistic updates, and honest progress bars change user perception."
publishedAt: "2025-08-14"
category: "Performance"
tags:
  - Performance
  - Frontend Engineering
  - UX
  - Web Development
---

Users don't experience milliseconds, they experience waiting. Two apps with identical server response times can feel wildly different depending on what happens on screen between the click and the result. That gap is where perceived performance lives, and it's often cheaper to fix than the underlying latency itself.

## Skeleton screens beat spinners

A spinner tells the user "something is happening" and nothing else. A skeleton screen tells them what is about to appear and roughly where it will land, which lets the brain start composing the layout before the data arrives. The trick is matching the skeleton's shape to the real content closely enough that the swap doesn't cause a jarring reflow. A card list skeleton with three lines and an avatar circle should map to a card list with three lines and an avatar circle, not a wall of gray rectangles that bears no resemblance to what loads.

The failure mode is overdoing it. Skeletons for content that resolves in under 100ms just add flicker. A common pattern is to delay the skeleton's appearance by 150-300ms so fast responses render directly and only slow ones get the placeholder treatment.

```javascript
function useDelayedLoading(isLoading, delay = 200) {
  const [showSkeleton, setShowSkeleton] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowSkeleton(false);
      return;
    }
    const timer = setTimeout(() => setShowSkeleton(true), delay);
    return () => clearTimeout(timer);
  }, [isLoading, delay]);

  return showSkeleton;
}
```

## Optimistic UI and honest rollback

Optimistic updates assume the mutation will succeed and update the UI immediately, reconciling with the server response afterward. A like button that toggles instantly, a comment that appears before the network round trip completes, a drag-and-drop reorder that commits visually before the backend confirms — these make an app feel instant because the user's action and the visual result are no longer separated by a network hop.

The part teams skip is the rollback path. If the mutation fails, the UI has to revert cleanly and tell the user what happened, not just silently snap back and leave them confused about whether their action registered. Keep the previous state around long enough to restore it, and surface a toast or inline error rather than a silent failure. Optimistic UI without a rollback story is a bug generator, not a performance win.

## Progress indicators that don't lie

Determinate progress bars are only honest when you actually know the total. Faking a progress bar that crawls to 90% and stalls trains users to distrust it. If you don't have real progress data — bytes transferred, steps completed — use an indeterminate indicator instead of fabricating numbers.

For genuinely long operations, break the work into stages and report which stage is active: "Uploading," then "Processing," then "Finalizing." Discrete stage labels give users a mental model of what's happening even without a precise percentage, and they make it obvious when something has stalled versus when it's just a naturally slow stage.

The common thread across all three techniques is the same: perceived performance work is really about reducing uncertainty. Users tolerate waiting far better when they know something is happening, roughly how long it will take, and what to expect when it's done. Chasing that certainty is often a better return on effort than shaving another 50ms off a database query.
