"""Give every AliExpress pick without a tagline one in the FreakyTimes voice, picked by product id so it never changes.

Run:  python3 scripts/ae_blurbs.py      then  python3 scripts/ae_catalog.py  to copy them onto the products.
"""
import hashlib
import json
import os

PICKS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'ae_picks.json')

POOL = {
    'bra-sets': ["Matching is a love language.", "Wear it under. Or don't.", "Two pieces, zero chill.", "The set that ends the argument.",
                 "Lace you'll want to show someone.", "Dressed to be undressed.", "For the nights you plan ahead.", "Cute on, cuter off."],
    'bodysuits': ["One piece, whole mood.", "Snaps at the bottom, trouble at the top.", "Wear it out, take it off later.", "Easy on, easier off."],
    'babydolls': ["Short, sheer and a little shy.", "Flowy enough to twirl in.", "Sweet face, bad plans.", "Light as a whisper."],
    'corsets': ["Snatched, laced and dangerous.", "Hold your breath, then hold their attention.", "Waist, but make it a weapon."],
    'bras': ["Support with benefits.", "Lift, lace and a little lie.", "The bra that skips the shirt."],
    'panties': ["Small, but it says a lot.", "Less fabric, more fun.", "Cheeky by design.", "The best kept secret in your drawer."],
    'garters': ["Straps that mean business.", "Holds up your stockings and your reputation.", "The finishing touch they notice last."],
    'robes': ["Throw it on, let it slip.", "Made for slow mornings and slower nights.", "Silky enough to open the door in."],
    'pajamas': ["Bedtime, but make it interesting.", "Too cute to sleep in.", "Staying in has never looked this good."],
    'slips': ["Silky, short and made for staying in.", "Slips on, slips off.", "Sleep is optional."],
    'stockings': ["Legs for days.", "Thigh high and a little dangerous.", "The detail that stops traffic."],
    'bodystockings': ["Head to toe, nothing to hide.", "Fishnet from the neck down.", "One piece, endless ideas."],
    'costumes': ["Play the part.", "Character work never looked this good.", "Who are you tonight?", "Halloween is a state of mind."],
    'dresses': ["Tight, short and going out.", "The dress that gets you the second drink.", "Bodycon, body confident."],
    'sets': ["Two pieces, one plan.", "Match it and mean it.", "Going out energy, top to bottom."],
    'bikinis': ["Tan lines optional.", "Pool party, private party.", "Less swim, more show."],
    'chokers': ["Something to hold onto.", "Around your neck, on their mind.", "Lace, leather or both."],
    'body-jewelry': ["Sparkle where it counts.", "Wear it with everything, or nothing.", "Little chains, big ideas."],
    'masks': ["Mystery is the best accessory.", "Eyes closed, mind open.", "Hide your face, not your mood."],
    'gloves': ["Hands off. Or not.", "Lace to the wrist, trouble to the elbow."],
    'pasties': ["Covered, technically.", "The tiniest top you'll ever own."],
    'extras': ["A little extra never hurt."],
}

picks = json.load(open(PICKS))
added = 0
for p in picks:
    pool = POOL.get(p['category'])
    if p.get('blurb') or not pool:
        continue
    p['blurb'] = pool[int(hashlib.md5(str(p['id']).encode()).hexdigest(), 16) % len(pool)]
    added += 1
json.dump(picks, open(PICKS, 'w'), indent=1, ensure_ascii=False)
open(PICKS, 'a').write('\n')
print(f'Added {added} taglines. {sum(1 for p in picks if not p.get("blurb"))} picks still without one.')
