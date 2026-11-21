"""Pick a store category for a product from its name (and old category as a fallback).

Names end in the product type ("... Red Lace Bra Set"), so the type words near the end decide.
Used by ae_import.py for new picks and by recategorize.py for the whole catalog.
"""
import re

# (pattern on the last few words of the name, category), first match wins. Bottoms and dresses before tops,
# because "Mini Skirt" or "Set" names can mention tops earlier on.
RULES = [
    (r'\b(costume|cosplay|uniform|roleplay|role play|outfit)$|\b(maid|nurse|bunny|police|cop|teacher|secretary|cheerleader|devil|angel) (costume|set|outfit|lingerie)$', 'costumes'),
    (r'\b(bodystocking|body stocking|fishnet bodysuit|catsuit stocking)$', 'bodystockings'),
    (r'\b(stockings|thigh highs?|tights|pantyhose|fishnets?|socks)$', 'stockings'),
    (r'\b(garter belt|garters?|leg garter|harness|body harness|suspender belt|suspenders)$', 'garters'),
    (r'\b(robe|kimono|dressing gown|bathrobe)$', 'robes'),
    (r'\b(pajamas?|pyjamas?|sleepwear set|pajama set|pj set|loungewear set|sleep set)$', 'pajamas'),
    (r'\b(nightgown|nightdress|nightie|sleep dress|slip dress|slip)$', 'slips'),
    (r'\b(babydoll|baby doll|chemise)$', 'babydolls'),
    (r'\b(teddy|bodysuit|body suit|jumpsuit lingerie|one piece lingerie)$', 'bodysuits'),
    (r'\b(corset|bustier|waist cincher|waist trainer|corset set)$', 'corsets'),
    (r'\b(bra set|bra and panty set|lingerie set|underwear set|2 piece set|3 piece set|three piece set|lingerie)$', 'bra-sets'),
    (r'\b(bra|bralette|bra top|push up bra|balconette)$', 'bras'),
    (r'\b(panties|panty|thong|g-string|g string|briefs?|knickers|underwear|cheeky|boyshorts)$', 'panties'),
    (r'\b(bikini|swimsuit|swimwear|monokini|one piece swimsuit|cover up)$|\bbikini set$', 'bikinis'),
    (r'\b(dress|gown)$', 'dresses'),
    (r'\b(set|jumpsuit|romper|playsuit|catsuit)$', 'sets'),
    (r'\b(choker|collar|leash)$', 'chokers'),
    (r'\b(body chain|waist chain|belly chain|chest chain|nipple rings?|nipple jewelry|anklet|jewelry)$', 'body-jewelry'),
    (r'\b(mask|masquerade mask|blindfold|eye mask)$', 'masks'),
    (r'\b(gloves?|arm sleeves?|mittens)$', 'gloves'),
    (r'\b(pasties|nipple covers?|nipple pasties|breast petals|body tape|boob tape)$', 'pasties'),
]

FALLBACK = {
    'lingerie': 'bra-sets', 'pajamas': 'pajamas', 'socks': 'stockings', 'bikinis': 'bikinis', 'dresses': 'dresses',
    'accessories': 'extras', 'jewelry': 'body-jewelry',
}


def new_category(name, old=None):
    n = re.sub(r'[^a-z0-9 -]', '', (name or '').lower()).strip()
    n = re.sub(r'\s+(no\s+\d+|ii)$', '', n)
    n = re.sub(r'\s+with\s+.*$', '', n)  # "Cardigan With Scarf" is a cardigan
    for pat, cat in RULES:
        if re.search(pat, n):
            return cat
    return FALLBACK.get(old, old or 'bra-sets')


def depts_for(name, category):
    """FreakyTimes is a women's store: everything is listed for women."""
    return ['women']
