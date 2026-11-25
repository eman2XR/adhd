# Requests

What the friend asked for and what was built, newest first. The site loop adds an entry for every round that ships.

## 2026-11-24: the request box as a button with a popup (asked by the owner)

Built: above the page, a single button ("What should this page do next?", with the paper plane and a drawn arrow) opens the request box in a popup: notifications, the prompt and the status of earlier requests. It closes with Close, a tap on the dimmed backdrop or Escape, and starts at its title, so no button is focused and VoiceOver reads the title first.

## 2026-11-24: a calendar to organise things (#3)

Asked: "I want a calendar to organize stuff".

Built: two tabs, Today and Calendar, like dividers in the notebook. Calendar: a month grid (Sunday or Monday first, from the phone's region) with today circled in pencil, dots for plans in their colours and a small leaf on days a Grow step was done; tap a day to see its plans, with the add box at the top of the day. Each plan has an optional time ("+ Add a time") and an optional colour (the five area colours or none), can be ticked off (it fills and gets a highlighter swipe), moved on ("Move to tomorrow"; plans on past days move to today; "No rush.") or edited; Remove is inside Edit, and moving or removing can be undone. Adding keeps the cursor in the field so several things can be jotted down quickly, and half-typed text survives taps. Timed plans are listed first, by time. Today's plans also show on the Today tab ("On your calendar today") with a quick "Add something to today" field. After midnight an open page moves to the new day by itself. Plans stay on the device (`state.events` in `site.grow.v1`). A new drawing: a spiral calendar page.

Left out for now: repeating plans, reminders at a set time (the page cannot schedule notifications by itself), syncing between devices. Good next asks.

Also: #2 was the owner's test message; answered without changes.

## 2026-11-24: a nicer, more personal look with hand-drawn illustrations (asked by the owner)

Built: an illustrated notebook. Warm paper with a dot grid and a little grain; Noteworthy headings and SF Rounded text; hand-drawn uneven pill buttons. Original ink drawings with watercolour washes (`web/js/art.js`, an SVG wobble filter, each line drawn twice like a pen going over it): an open book, a checklist with a pencil, a sneaker, a house with a heart from the chimney, two speech bubbles, a paper plane on the request box, a star on the note, a heart in the footer. The header plant has one leaf per area that colours in when that step is done (all five bring out the sun and sparkles). The tick is a pencil circle that fills and draws its tick; finished steps get a highlighter swipe and a handwritten "done!"; ticking off throws a few falling leaves. A greeting by time of day, and "Today, I am proud of" became a taped sticky note with ruled lines. Light and dark.

## 2026-11-24: keep the request box at the top (asked by the owner)

Built: once the page has content, the request box (notifications and the prompt) stays as a smaller box above the page instead of a floating "Change something" button.

## 2026-11-24: Grow, the starter page (by text message, no issue)

Asked (sent to the owner by text): "i want to be a better person, learn more, be more productive, do more sports, spend more time with my family, build better network for work, overall grow as a person". The owner asked for a starter page for this.

Built: "Grow a little every day". Five areas taken from the message (Learn, Get things done, Move, Family, Network), each showing one tiny step for today (2 to 10 minutes) with a tick, "Start 5 min" (a sticky five-minute timer to beat getting started) and "Another idea". "Just one thing" picks one open area and dims the rest, for heavy days. A five-segment bar shows today's progress, dots show the last seven days per area, streaks appear from two days. A short burst and a cheer when something is ticked off (none with Reduce Motion). Own ideas per area join the suggestions. "Today, I am proud of" keeps one line a day and shows the last five. All data stays on the device (localStorage `site.grow.v1`).

Left out on purpose: reminders, scores and long-term goals; the first version stays small so it does not feel like another chore. Good next asks: daily reminder notifications, a weekly look back, goals per area.

## 2026-11-24: starting point

An empty page with a request box. Nothing requested yet.
