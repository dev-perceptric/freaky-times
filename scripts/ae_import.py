"""Turn a list of AliExpress items (id + title) into scripts/ae_picks.json entries.

Sorts each item into a store category from its title, skips kids' items, anything that hints at minors,
sex toys, knockoffs and character art, and writes a short clean name. Existing picks are kept.

Run:  python3 scripts/ae_import.py items.json        (items.json = [{"id": "...", "title": "..."}])
Then: python3 scripts/ae_catalog.py
"""
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ae_cats import depts_for, new_category  # noqa: E402

PICKS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts', 'ae_picks.json')
# Items removed by hand (copyrighted art, duplicates). Never imported again.
BLOCKED = os.path.join(os.path.dirname(PICKS), 'ae_blocked.json')

# Skip what can't be sold safely: kids' items, anything that hints at minors, sex toys (this is a lingerie store),
# and copyrighted characters or brand logos.
SKIP = re.compile(
    r"\b(school ?girl|student|teen|teens|teenage|young girl|little girl|loli|lolita|underage|jailbait|barely legal|virgin)\b|"
    r"\b(vibrator|dildo|butt plug|anal|masturbat\w*|sex toy|sex toys|penis|cock ring|strap[- ]on|egg vibe|wand massager)\b|"
    r"\b(kid|kids|child|children|toddler|infant|newborn|baby (girl|boy)|boys|girls'|maternity|pregnan|pet|dog clothes|(?<!baby )doll)\b|"
    r"(nike|adidas|disney|hello ?kitty|sanrio|kuromi|my melody|cinnamoroll|marvel|pokemon|pikachu|barbie|harry potter|star wars|mickey|minnie|stitch|"
    r"gucci|chanel|louis vuitton|supreme|nfl|nba|naruto|one piece(?! (swim|bodysuit|lingerie|teddy|bikini|dress|set))|dragon ball|jojo|spongebob|simpsons|anime|manga|hatsune|miku|sakura|minecraft|nyan|"
    r"pop ?tart|pierce the veil|my chemical|nirvana|metallica|slipknot|ramones|misfits|house of 1000|corpse bride|nightmare before|tim burton|"
    r"playboy|vans|carhartt|stussy|balenciaga|prada|dior|chrome hearts|ed hardy|juicy couture|von dutch|bratz|monster high|tokidoki|domo|"
    r"invader zim|care bears|my little pony|garfield|snoopy|peanuts|sonic|mario|zelda|kirby|squishmallow|labubu|king von|trippie|curious george|attack on titan)",
    re.I)

KIDS = re.compile(r"\b(kid|kids|child|children|toddler|infant|newborn|baby (girl|boy)|boys|girls'|maternity|pregnan|pet|dog clothes|(?<!baby )doll)\b|"
                  r"\b(school ?girl|student|teen|teens|teenage|young girl|little girl|loli|lolita|underage|jailbait|barely legal)\b", re.I)
KEEP_ALL = '--keep-all' in sys.argv
ALLOW_MEN = '--allow-men' in sys.argv

# (category, product word) by title keywords, first match wins. Specific types before general ones.
TYPES = [
    (r'\b(costume|cosplay|role ?play|uniform)\b', 'costumes', None),
    (r'\b(body ?stocking|bodystockings|fishnet bodysuit)\b', 'bodystockings', 'Bodystocking'),
    (r'\b(garter belt|suspender belt|leg garter|garters?|body harness|harness)\b', 'garters', None),
    (r'\b(stockings?|thigh[- ]?highs?|pantyhose|tights|fishnets?)\b', 'stockings', None),
    (r'\b(robe|kimono|bathrobe|dressing gown)\b', 'robes', None),
    (r'\b(pajamas?|pyjamas?|sleepwear set|pj set|sleep set|loungewear set)\b', 'pajamas', 'Pajama Set'),
    (r'\b(babydoll|baby doll|chemise)\b', 'babydolls', None),
    (r'\b(nightgown|nightdress|nightie|sleep ?dress|sleepwear|slip dress)\b', 'slips', None),
    (r'\b(teddy|bodysuit|body suit|one[- ]piece lingerie)\b', 'bodysuits', None),
    (r'\b(corset|bustier|waist cincher|waist trainer)\b', 'corsets', None),
    (r'\b(bikini|swimsuit|swimwear|monokini)\b', 'bikinis', None),
    (r'\b(body chain|waist chain|belly chain|chest chain|nipple (ring|jewelry|chain)s?|anklet)\b', 'body-jewelry', None),
    (r'\b(bra (and|&) panty|bra set|lingerie set|underwear set|[23] ?(piece|pcs)|three piece|lingerie)\b', 'bra-sets', None),
    (r'\b(bralette|bra|bras|push[- ]up)\b', 'bras', None),
    (r'\b(panties|panty|thong|g[- ]?string|briefs?|knickers|underwear|cheeky)\b', 'panties', None),
    (r'\b(choker|collar|leash)\b', 'chokers', None),
    (r'\b(mask|blindfold|masquerade)\b', 'masks', None),
    (r'\b(gloves?|arm sleeves?)\b', 'gloves', None),
    (r'\b(pasties|nipple covers?|breast petals|boob tape|body tape)\b', 'pasties', 'Pasties'),
    (r'\b(dress|bodycon|gown)\b', 'dresses', 'Dress'),
    (r'\b(two[- ]piece set|matching set|jumpsuit|catsuit|romper|playsuit|outfit set)\b', 'sets', None),
]

WORDS = [
    ('lace', 'Lace'), ('mesh', 'Mesh'), ('sheer', 'Sheer'), ('see through', 'Sheer'), ('transparent', 'Sheer'), ('fishnet', 'Fishnet'),
    ('satin', 'Satin'), ('silk', 'Silk'), ('velvet', 'Velvet'), ('leather', 'Leather'), ('latex', 'Latex'), ('vinyl', 'Vinyl'), ('pvc', 'Vinyl'),
    ('wet look', 'Wet Look'), ('strappy', 'Strappy'), ('bandage', 'Strappy'), ('cut out', 'Cut-Out'), ('cutout', 'Cut-Out'), ('hollow', 'Cut-Out'),
    ('backless', 'Backless'), ('open cup', 'Open Cup'), ('cupless', 'Open Cup'), ('crotchless', 'Open Crotch'), ('open crotch', 'Open Crotch'),
    ('halter', 'Halter'), ('deep v', 'Plunge'), ('plunge', 'Plunge'), ('push up', 'Push-Up'), ('push-up', 'Push-Up'), ('underwire', 'Underwire'),
    ('high cut', 'High-Cut'), ('high waist', 'High-Waist'), ('ruffle', 'Ruffle'), ('bow', 'Bow'), ('heart', 'Heart'), ('cherry', 'Cherry'),
    ('floral', 'Floral'), ('embroider', 'Embroidered'), ('rhinestone', 'Rhinestone'), ('diamond', 'Rhinestone'), ('pearl', 'Pearl'),
    ('feather', 'Feather'), ('fur', 'Faux Fur'), ('chain', 'Chain'), ('leopard', 'Leopard'), ('polka', 'Polka Dot'), ('bridal', 'Bridal'),
    ('wedding', 'Bridal'), ('goth', 'Goth'), ('kawaii', 'Kawaii'), ('plus size', 'Plus Size'), ('bunny', 'Bunny'), ('maid', 'Maid'),
    ('nurse', 'Nurse'), ('kitty', 'Kitty'), ('cat ', 'Kitty'), ('devil', 'Devil'), ('angel', 'Angel'), ('police', 'Police'),
    ('cheerleader', 'Cheerleader'), ('valentine', 'Valentine'), ('christmas', 'Christmas'), ('santa', 'Christmas'),
    ('red', 'Red'), ('black', 'Black'), ('white', 'White'), ('pink', 'Pink'), ('purple', 'Purple'),
]

DEFAULT_WORD = {
    'costumes': 'Costume', 'garters': 'Garter Belt', 'stockings': 'Thigh Highs', 'robes': 'Robe', 'babydolls': 'Babydoll', 'slips': 'Nightgown',
    'bodysuits': 'Bodysuit', 'corsets': 'Corset', 'bikinis': 'Bikini', 'bra-sets': 'Lingerie Set', 'bras': 'Bralette', 'panties': 'Thong',
    'chokers': 'Choker', 'body-jewelry': 'Body Chain', 'masks': 'Mask', 'gloves': 'Gloves', 'sets': 'Two Piece Set',
}


def classify(title):
    t = title.lower()
    for pat, cat, word in TYPES:
        if not re.search(pat, t):
            continue
        # A lingerie set that comes with garters or stockings is still a set.
        if cat in ('garters', 'stockings') and re.search(r'\b(set|bra|lingerie|panty|panties|bodysuit|teddy|babydoll)\b', t):
            continue
        if cat == 'costumes':
            word = next((w.title() + ' Costume' for w in ('bunny', 'maid', 'nurse', 'police', 'teacher', 'secretary', 'cheerleader', 'devil', 'angel', 'cat', 'kitty', 'santa') if re.search(r'\b' + w + r'\b', t)), 'Costume')
            word = word.replace('Cat Costume', 'Kitty Costume').replace('Santa Costume', 'Christmas Costume')
        elif cat == 'garters':
            word = 'Harness' if 'harness' in t else 'Leg Garter' if re.search(r'leg garter', t) else 'Garter Belt'
        elif cat == 'stockings':
            word = 'Fishnet Stockings' if 'fishnet' in t else 'Tights' if re.search(r'tights|pantyhose', t) else 'Thigh Highs'
        elif cat == 'robes':
            word = 'Kimono' if 'kimono' in t else 'Robe'
        elif cat == 'babydolls':
            word = 'Chemise' if 'chemise' in t else 'Babydoll'
        elif cat == 'slips':
            word = 'Slip Dress' if re.search(r'slip', t) else 'Nightgown'
        elif cat == 'bodysuits':
            word = 'Teddy' if 'teddy' in t else 'Bodysuit'
        elif cat == 'corsets':
            word = 'Bustier' if 'bustier' in t else 'Corset'
        elif cat == 'bikinis':
            word = 'One Piece Swimsuit' if re.search(r'one[- ]piece|swimsuit|monokini', t) and 'bikini' not in t else 'Bikini'
        elif cat == 'bra-sets':
            word = 'Three Piece Lingerie Set' if re.search(r'3 ?(piece|pcs)|three piece', t) else 'Lingerie Set'
        elif cat == 'bras':
            word = 'Push-Up Bra' if re.search(r'push[- ]up', t) else 'Bralette' if 'bralette' in t else 'Bra'
        elif cat == 'panties':
            word = 'G-String' if re.search(r'g[- ]?string', t) else 'Thong' if 'thong' in t else 'Panties'
        elif cat == 'chokers':
            word = 'Collar' if re.search(r'collar|leash', t) else 'Choker'
        elif cat == 'body-jewelry':
            word = 'Waist Chain' if re.search(r'waist|belly', t) else 'Nipple Jewelry' if 'nipple' in t else 'Anklet' if 'anklet' in t else 'Body Chain'
        elif cat == 'masks':
            word = 'Blindfold' if 'blindfold' in t else 'Mask'
        elif cat == 'gloves':
            word = 'Arm Sleeves' if 'sleeve' in t else 'Gloves'
        elif cat == 'sets':
            word = 'Catsuit' if 'catsuit' in t else 'Jumpsuit' if re.search(r'jumpsuit|romper|playsuit', t) else 'Two Piece Set'
        return cat, word or DEFAULT_WORD.get(cat, 'Lingerie Set')
    return None, None


def name_for(title, word, used):
    t = title.lower()
    picked = []
    for key, label in WORDS:
        if re.search(r'\b' + re.escape(key), t) and label not in picked and label.lower() not in word.lower():
            picked.append(label)
    for n in (2, 1, 3, 4, 5):
        name = ' '.join(picked[:n] + [word]) if picked else word
        if name not in used:
            return name
    i = 2
    while f'{name} {i}' in used:
        i += 1
    return f'{name} {i}'


def fill_titles(items):
    """Some store pages hide product names, so the browser button only sends the number. Look those up."""
    missing = [it for it in items if not (it.get('title') or '').strip()]
    if not missing:
        return
    from ae_catalog import admin, result_of  # noqa: E402 (needs ADMIN_TOKEN)
    print(f'Looking up {len(missing)} product names on AliExpress...')
    for it in missing:
        try:
            res = result_of(admin('aliexpress.ds.product.get', {'product_id': str(it['id']), 'ship_to_country': 'US',
                                                               'target_currency': 'USD', 'target_language': 'en'}), 'aliexpress.ds.product.get')
            it['title'] = ((res or {}).get('ae_item_base_info_dto') or {}).get('subject') or ''
        except SystemExit as e:
            print(f'  {it["id"]}: {e}')
        except Exception as e:  # noqa: BLE001
            print(f'  {it["id"]}: {e}')


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    items = json.load(open(sys.argv[1]))
    fill_titles(items)
    picks = json.load(open(PICKS)) if os.path.exists(PICKS) else []
    have = {str(p['id']) for p in picks}
    have |= set(json.load(open(BLOCKED))) if os.path.exists(BLOCKED) else set()
    used = {p.get('name') for p in picks}
    added = skipped = 0
    for it in items:
        pid, title = str(it['id']), it.get('title') or ''
        if pid in have:
            continue
        # --keep-all: only skip kids' items; keep character, meme and brand prints.
        if (KIDS.search(title) if KEEP_ALL else SKIP.search(title)):
            skipped += 1
            continue
        cat, word = classify(title)
        if not cat:
            skipped += 1
            continue
        # Women's store: skip anything sold only for men.
        if not ALLOW_MEN and re.search(r"\b(men'?s|for men|male|boyfriend)\b", title, re.I) and not re.search(r'\b(women|woman|female|ladies|girl)', title, re.I):
            skipped += 1
            continue
        name = name_for(title, word, used)
        cat = new_category(name, cat)
        used.add(name)
        have.add(pid)
        pick = {'id': pid, 'category': cat, 'name': name, 'depts': depts_for(name, cat)}
        if re.search(r'\b(plus size|plus|curvy|[4-6]xl)\b', title, re.I):
            pick['tags'] = ['plus']
        picks.append(pick)
        added += 1
        print(f'  + {cat:13} {name:34} {title[:70]}')
    with open(PICKS, 'w') as f:
        json.dump(picks, f, indent=1, ensure_ascii=False)
        f.write('\n')
    print(f'Added {added}, skipped {skipped}. {len(picks)} picks in total.')


if __name__ == '__main__':
    main()
