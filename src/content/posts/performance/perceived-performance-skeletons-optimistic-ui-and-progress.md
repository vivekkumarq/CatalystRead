---
title: "Perceived Performance: Skeletons, Optimistic UI, and Progress"
slug: "perceived-performance-skeletons-optimistic-ui-and-progress"
description: "Why the fastest-feeling apps aren't always the fastest apps, and how skeletons, optimistic updates, and honest progress bars change user perception."
publishedAt: "2025-08-14"
updatedAt: "2026-09-16"
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

## A worked example

Article page: skeleton with reserved image height (no CLS), then content. Like button: optimistic increment, rollback on 409. Upload: determinate progress from `xhr.upload`. You never use a looping skeleton for a 200ms API — it flickers. Prefer showing stale cache (stale-while-revalidate) over a blank.

A/B: time-to-first-meaningful-paint vs completion rate, not only LCP.

## Failure modes

Optimistic UI that cannot roll back (inventory). Skeletons that do not match layout. Spinners on every keystroke. Fake progress that jumps to 99% and sits. Disabling the whole page. Accessibility: not exposing `aria-busy`.

Cached optimistic state after logout.

## When this is the wrong tool

A bank transfer confirmation should wait for the server. Skeletons will not hide a 10s query forever — users need a message. Do not optimistic-delete a record with heavy side effects. Games and video have their own loading. If the issue is JS parse time, split the bundle; skeletons on a white screen of no JS do nothing. Avoid fake progress as a lie for legal operations.

## A worked failure mode

Optimistic UI marks a payment succeeded; the API fails; the UI never reconciles and the user leaves thinking they paid. A skeleton layout shifts when real content has a different size (CLS). A spinner is shown for 50ms operations, making the app feel slower. The failure is lying without a recovery, and chrome that hurts Core Web Vitals. Optimistic only when you can undo; reserve skeletons for known layouts; skip spinners below a threshold.

Perceived-performance tricks are the wrong tool if the request is actually broken. Do not fake success on money. Use them to hide unavoidable waits you still measure honestly.

A second, quieter failure is operational: the idea is copied from a talk into a path that has no rollback, no owner, and no metric that would show the invariant breaking. For "Perceived Performance: Skeletons, Optimistic UI, and Progress", that usually means a Friday deploy with production as the first realistic test. Write down the user-visible symptom, the invariant, and the revert before you scale the pattern. If revert is a data rewrite, you do not have a revert—you have a project. Practice the failure in staging with production-sized data at least once, or you will practice it on customers.
