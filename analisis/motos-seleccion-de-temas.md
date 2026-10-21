# Motorcycles × the "Alex's side quest" format: viral-pattern analysis and topic selection

> This document is for **choosing the topic**. Nothing gets produced until you pick one.
> Base: `transcripciones/alex_side_quest.*` (the full script, OCR'd from its captions) and the video watched frame by frame every 0.5 s.

---

## 1. What the Alex video does, measured

**Data:** vertical 720×1280, **42.7 s**, 30 fps, **131 words** of narration (**3.1 words/s ≈ 185 wpm**, fast) split into **66 captions of 2 words** (0.6 s each on average). About **40 distinct shots** (one visual change per second). The "X-ray" mode (car turned into a green hologram to show the inside) takes up **~30% of the runtime**.

### The script, beat by beat

| Time | Narration | Picture | Function |
|---|---|---|---|
| 0–1.5 s | "Alex is being chased by police…" | Alex at the wheel → patrol car behind | **Hook with stakes**: named protagonist + danger. No intro, no logo |
| 1.5–3.7 s | "…but he's driving the new **Tesla Roadster**" | Police car, Empire State in the background → **first X-ray flash** of the car | **Anchor**: a real, famous, hyped product (the brand does half the work) |
| 3.8–9.8 s | "Instead of stopping, he activates the Roadster's powerful **suction system** and drives straight toward the **Empire State Building**" | Hand on the screen → X-ray of Alex → car speeding at the landmark | **Expectation broken** ("instead of stopping") + **world-famous landmark** |
| 10.2–19 s | "Four powerful fans suck air out from underneath… low pressure… the higher air pressure outside pushes the car against the wall with enormous force" | X-ray top view of the fans, **green arrows** of air pressure, car pressed against the façade | **Mechanism with real physics**: the viewer feels they *learned something* (a reason to save and share) |
| 19.2–21.8 s | "allowing Alex to drive straight up the skyscraper" | Low-angle shot: the car climbing up the building | **First payoff**: the impossible, but "explained" |
| 22–25.7 s | "But as he reaches the top, his wheels suddenly lose contact with the building" | Car tilting at the edge, blur, darkness | **Complication** (new open loop) |
| 26–34.3 s | "That's when Alex activates the **SpaceX thrusters**. High-pressure **nitrogen** blasts out through powerful nozzles…" | Finger on the screen → X-ray of the tanks → nozzles in macro → the car launched into the night | **Second gadget + second famous brand**; another dose of technical vocabulary |
| 34.5–38.7 s | "Additional thrusters keep the car balanced as it flies toward a nearby rooftop" | X-ray mid-air → landing | Bonus mechanism + payoff |
| 38.8–42.7 s | "Then he activates again to jump on another rooftop… and then another… and **escapes**" | Rooftop jumps, skyline | **Fast ending, no conclusion or call to action**: it ends on a single word, the video loops and you watch it again |

### The 9 patterns that make it viral

1. **First second = character + danger.** "Alex is being chased by police." There's no "did you know…?". A name makes you care.
2. **Real, famous, hyped product.** Tesla Roadster and SpaceX: people recognise them, they're being talked about right now, and "is that real?" generates **comments** (the strongest signal for the algorithm).
3. **Impossible but "explained".** The stunt is fantasy (driving up the Empire State), but the explanation uses real physics: pressure difference, nitrogen thrust. That creates the **"I learned something"** feeling, which gets saves and shares.
4. **Chain of "instead of… / but… / that's when…".** A new open loop every **4–8 s**: suction → climb → loses contact → thrusters → flight → another rooftop. Escalation, never a plateau.
5. **A visual change every second** (~40 shots in 43 s), alternating three registers: **action** (chase, flight), **X-ray** (inside the machine), **close-up of the hand/screen** (the button that triggers the next gadget).
6. **X-ray as the signature.** The green hologram with arrows turns the explanation into something you can *see*. It's the most recognisable visual element of the genre.
7. **Universal landmark.** The Empire State: anyone, anywhere, recognises it. It's the setting and also a promise ("he's going to climb *that*").
8. **2-word captions, centred, bold, white.** You can follow it with no sound (most people scroll on mute) and they set the pace of the reading.
9. **Ending with no outro.** It cuts on "escapes". No moral, no "follow me". The loop restarts on its own; the rewatch inflates retention.

**Base formula (to reuse):**
> *[Name] + [danger in 1 s] + "but he's riding/driving [famous real product]" + "instead of [the obvious], he activates [real or rumoured technology]" + [physics mechanism in X-ray] + [impossible payoff] + "but…" + [second gadget/brand] + [chained payoff] + [ending in 1 word]*

---

## 2. Requirements for the motorcycle topic

For it to work outside the motorcycling niche:
- **Stakes everyone understands** (escape, crash, rescue, traffic), not specs.
- **A real product or technology with a name**: a famous brand or something that already went viral.
- **A mechanism that can be shown in X-ray** with simple physics (air, pressure, gyroscope, gas, hydrogen).
- **A recognisable landmark or setting.**
- **Code-feasible** (three.js, like the claw machine): bikes, rider, city, X-ray shader. A quadruped robot or an airbag are doable; photoreal crowds are not.

---

## 3. Candidate topics (scored 1–5)

| # | Topic | Real anchor (verified) | Hook (draft) | Mass appeal | "Is that real?" | X-ray | Code feasibility |
|---|---|---|---|---|---|---|---|
| **A** | **The robot horse that replaces the bike** | **Kawasaki Corleo**: a four-legged riding robot with a **150 cc hydrogen engine** that you steer by shifting your body weight; Kawasaki created a dedicated team ("Safe Adventure") reporting to the CEO, with a simulator for 2027, Expo 2030 Riyadh and sales in 2035 | "Leo is stuck in a canyon… but he's riding Kawasaki's new **robot horse**" | 5 (robots + horses: kids, adults, non-riders) | 5 | 5 (hydrogen engine, legs with motorcycle swingarm, balance) | 4 (procedural leg animation) |
| **B** | **The airbag that inflates before you hit the ground** | Airbag vests like **Alpinestars Tech-Air**: sensors that read ~1,000 times per second and **inflate with nitrogen in a few dozen milliseconds** (figures vary by source); **Honda Gold Wing** was the first production motorcycle with an airbag (a V-shaped bag tethered to the frame, sensors in the fork) | "Lucas is a delivery rider. A truck cuts him off at 60 km/h… but he's wearing the **airbag**" | 5 (everyone knows a delivery rider; fear of accidents) | 4 | 5 (sensors → gas → bag in slow motion) | 5 |
| **C** | **The trick so good MotoGP banned it** | **Ride-height / holeshot devices**: they lower the bike at the start and out of corners; **banned in MotoGP from 2027** (along with the drop to 850 cc) | "This device made MotoGP bikes so fast… they're banning it" | 3 (strong with sport fans, weaker outside) | 4 ("banned" sells) | 4 (hydraulics, suspension) | 4 |
| **D** | **The bike that never falls over** | Self-balancing bikes: **Honda Riding Assist** (concept), **BMW Vision Next 100**, and **OMOWAY OMO X**, billed as a mass-produced self-balancing electric bike | "Mateo stops in the worst traffic in the world… and his bike doesn't touch the ground" | 4 | 4 | 4 (gyroscope, steering micro-corrections) | 5 |
| **E** | **The flying motorbike over the traffic jam** | **Rictor Skyrider X6** (shown at CES 2026, < 60,000 €), **Volonaut AirBike** (jet propulsion, no propellers) | "Sofía is late, the city is jammed… so she switches on her **flying motorbike**" | 5 | 5 | 4 (rotors/jets) | 4 |

### Reading
- **E** is the closest to Alex's video, so it's the safest bet… but also the most "already seen" (flying car → flying bike). Risk of looking like a copy.
- **C** has the best hook word ("banned"), but its audience is mostly sport fans.
- **A and B** meet every requirement and are hard to confuse with Alex:
  - **A (Kawasaki Corleo)** is the most original and visual: a real, rideable robot horse from a motorcycle brand. It's the topic most likely to make someone who has never ridden a bike stop scrolling.
  - **B (airbag)** is the most emotional and useful: real danger, real tech that saves lives, and an ending that gets shared ("send this to someone who rides a bike"). Its weakness: it's less "impossible", so the escalation has to come from the chain of tech (airbag → helmet that calls 911 → …).

**My recommendation: A, with B as an alternative.** If you want to play safe for reach, E.

---

## 4. Decisions I need from you

1. **Topic**: A, B, C, D, E, or a mix (e.g. A + the hydrogen side, or B + Quin's crash-detection helmet).
2. **Language of narration and captions**: Spanish, English, or both (two versions)?
3. **Voice in ElevenLabs**: a dramatic male narrator like Alex's, or something else? I'll pick from your voice library with `creative_list_voices` once you've chosen.

Once the topic is chosen, the next step is the **script beat by beat with timings** (same table as section 1) for you to approve before writing any code.

---

### Caveats
- The technical figures (airbag inflation times, Rictor price, Corleo dates) come from press and manufacturer material; several sources disagree with each other. The script will use them in round numbers and without promising things the product doesn't do.
- The stunt can be fantasy (like climbing the Empire State), but the **mechanism** must be real, because the comments will check.

### Sources
- [Kawasaki develops an H₂-powered robotic horse (electrive, Mar 2026)](https://www.electrive.com/2026/03/03/kawasaki-develops-an-h%e2%82%82-powered-robotic-horse/)
- [Meet Kawasaki's robo-horse (TimesLive, Jan 2026)](https://www.timeslive.co.za/motoring/2026-01-09-meet-kawasakis-robo-horse/)
- [From hay to hydrogen: Kawasaki's robotic horse gets serious (newmobility.news, Feb 2026)](https://newmobility.news/en/2026/02/27/from-hay-to-hydrogen-kawasakis-robotic-horse-gets-serious/)
- [How It Works: Modern Airbag Suits (RideApart)](https://rideapart.com/articles/how-motorcycle-airbag-suits-work)
- [Honda: the world's first production motorcycle airbag system](https://global.honda/en/tech/Motorcycle_Airbag_System/)
- [MotoGP confirms 2027 regulations (Crash.net)](https://www.crash.net/motogp/news/1048005/1/motogp-confirms-2027-regulations-here-they-are)
- [MotoGP unveils its new rules from 2027](https://www.motogp.com.au/fan-zone/news/motogp-unveils-its-new-rules-from-2027)
- [The motorcycles of CES 2026: solid-state batteries and another flying bike (RevZilla)](https://www.revzilla.com/common-tread/the-motorcycles-of-ces-2026-solid-state-batteries-and-another-flying-bike)
- [Rictor flying motorbike (eVTOL Insights)](https://evtolinsights.com/rictor-flying-motorbike-launches-in-2026/)
- [New and Exciting Motorcycle Trends for 2026 (Cycle Trader)](https://www.cycletrader.com/blog/2025/11/28/new-and-exciting-motorcycle-trends-for-2026/)
- [12 New Motorcycles Coming Out In 2026 (SlashGear)](https://www.slashgear.com/2140892/new-motorcycles-coming-out-excited-about/)
