/**
 * Word finder helper for e2e tests.
 *
 * Finds valid words that can be traced on a game grid.
 */

// Common 3-4 letter words that are definitely in the dictionary
// These are the most likely to appear in random grids
const COMMON_WORDS = new Set([
  // 3-letter words
  'ACE', 'ACT', 'ADD', 'AGE', 'AGO', 'AID', 'AIM', 'AIR', 'ALL', 'AND', 'ANT', 'ANY', 'APE', 'ARC', 'ARE', 'ARK', 'ARM', 'ART', 'ASH', 'ASK', 'ATE',
  'BAD', 'BAG', 'BAN', 'BAR', 'BAT', 'BAY', 'BED', 'BEE', 'BET', 'BIG', 'BIT', 'BOW', 'BOX', 'BOY', 'BUD', 'BUG', 'BUN', 'BUS', 'BUT', 'BUY',
  'CAB', 'CAN', 'CAP', 'CAR', 'CAT', 'COB', 'COD', 'COG', 'COP', 'COT', 'COW', 'CRY', 'CUB', 'CUD', 'CUP', 'CUR', 'CUT',
  'DAB', 'DAD', 'DAM', 'DAY', 'DEN', 'DEW', 'DID', 'DIE', 'DIG', 'DIM', 'DIP', 'DOC', 'DOE', 'DOG', 'DOT', 'DRY', 'DUB', 'DUD', 'DUE', 'DUG', 'DYE',
  'EAR', 'EAT', 'EEL', 'EGG', 'ELF', 'ELK', 'ELM', 'EMU', 'END', 'ERA', 'EVE', 'EWE', 'EYE',
  'FAD', 'FAN', 'FAR', 'FAT', 'FED', 'FEE', 'FEW', 'FIG', 'FIN', 'FIR', 'FIT', 'FIX', 'FLU', 'FLY', 'FOB', 'FOE', 'FOG', 'FOR', 'FOX', 'FRY', 'FUN', 'FUR',
  'GAB', 'GAG', 'GAL', 'GAP', 'GAS', 'GEL', 'GEM', 'GET', 'GIG', 'GIN', 'GNU', 'GOB', 'GOD', 'GOT', 'GUM', 'GUN', 'GUT', 'GUY', 'GYM',
  'HAD', 'HAM', 'HAS', 'HAT', 'HAY', 'HEM', 'HEN', 'HER', 'HEW', 'HID', 'HIM', 'HIP', 'HIS', 'HIT', 'HOB', 'HOG', 'HOP', 'HOT', 'HOW', 'HUB', 'HUE', 'HUG', 'HUM', 'HUT',
  'ICE', 'ICY', 'ILL', 'IMP', 'INK', 'INN', 'ION', 'IRE', 'IRK', 'ITS', 'IVY',
  'JAB', 'JAG', 'JAM', 'JAR', 'JAW', 'JAY', 'JET', 'JIG', 'JOB', 'JOG', 'JOT', 'JOY', 'JUG', 'JUT',
  'KEG', 'KEN', 'KEY', 'KID', 'KIN', 'KIT',
  'LAB', 'LAC', 'LAD', 'LAG', 'LAP', 'LAW', 'LAY', 'LEA', 'LED', 'LEG', 'LET', 'LID', 'LIE', 'LIP', 'LIT', 'LOG', 'LOT', 'LOW', 'LUG',
  'MAD', 'MAN', 'MAP', 'MAR', 'MAT', 'MAW', 'MAY', 'MEN', 'MET', 'MID', 'MIX', 'MOB', 'MOM', 'MOP', 'MOW', 'MUD', 'MUG', 'MUM',
  'NAB', 'NAG', 'NAP', 'NAY', 'NET', 'NEW', 'NIL', 'NIP', 'NIT', 'NOB', 'NOD', 'NOR', 'NOT', 'NOW', 'NUB', 'NUN', 'NUT',
  'OAF', 'OAK', 'OAR', 'OAT', 'ODD', 'ODE', 'OFF', 'OFT', 'OHM', 'OIL', 'OLD', 'ONE', 'OPT', 'ORB', 'ORE', 'OUR', 'OUT', 'OWE', 'OWL', 'OWN',
  'PAD', 'PAL', 'PAN', 'PAP', 'PAR', 'PAT', 'PAW', 'PAY', 'PEA', 'PEG', 'PEN', 'PEP', 'PER', 'PET', 'PEW', 'PIE', 'PIG', 'PIN', 'PIT', 'PLY', 'POD', 'POP', 'POT', 'POW', 'PRY', 'PUB', 'PUG', 'PUN', 'PUP', 'PUT',
  'RAG', 'RAM', 'RAN', 'RAP', 'RAT', 'RAW', 'RAY', 'RED', 'REF', 'REP', 'RIB', 'RID', 'RIG', 'RIM', 'RIP', 'ROB', 'ROD', 'ROE', 'ROT', 'ROW', 'RUB', 'RUG', 'RUM', 'RUN', 'RUT', 'RYE',
  'SAC', 'SAD', 'SAG', 'SAP', 'SAT', 'SAW', 'SAY', 'SEA', 'SET', 'SEW', 'SHE', 'SHY', 'SIN', 'SIP', 'SIR', 'SIS', 'SIT', 'SIX', 'SKI', 'SKY', 'SLY', 'SOB', 'SOD', 'SON', 'SOP', 'SOT', 'SOW', 'SOY', 'SPA', 'SPY', 'STY', 'SUB', 'SUM', 'SUN', 'SUP',
  'TAB', 'TAD', 'TAG', 'TAN', 'TAP', 'TAR', 'TAT', 'TAX', 'TEA', 'TEN', 'THE', 'THY', 'TIC', 'TIE', 'TIN', 'TIP', 'TOE', 'TON', 'TOO', 'TOP', 'TOT', 'TOW', 'TOY', 'TRY', 'TUB', 'TUG', 'TWO',
  'URN', 'USE',
  'VAN', 'VAT', 'VET', 'VIA', 'VIE', 'VOW',
  'WAD', 'WAG', 'WAR', 'WAS', 'WAX', 'WAY', 'WEB', 'WED', 'WEE', 'WET', 'WHO', 'WHY', 'WIG', 'WIN', 'WIT', 'WOE', 'WOK', 'WON', 'WOO', 'WOW',
  'YAK', 'YAM', 'YAP', 'YAW', 'YEA', 'YES', 'YET', 'YEW', 'YIN', 'YOU', 'YOW',
  'ZAP', 'ZED', 'ZEN', 'ZIP', 'ZIT', 'ZOO',

  // 4-letter words (high frequency)
  'ABLE', 'ACHE', 'ACID', 'ALSO', 'ARCH', 'AREA', 'ARMS', 'ARMY', 'ARTS', 'ATOM', 'AUTO', 'AWAY',
  'BABY', 'BACK', 'BAGS', 'BAIL', 'BAIT', 'BAKE', 'BALD', 'BALL', 'BALM', 'BAND', 'BANE', 'BANG', 'BANK', 'BARE', 'BARK', 'BARN', 'BASE', 'BATH', 'BATS', 'BEAD', 'BEAK', 'BEAM', 'BEAN', 'BEAR', 'BEAT', 'BEDS', 'BEEF', 'BEEN', 'BEER', 'BEES', 'BELL', 'BELT', 'BEND', 'BENT', 'BEST', 'BETS', 'BIKE', 'BILE', 'BILL', 'BIND', 'BIRD', 'BITE', 'BITS', 'BLEW', 'BLIP', 'BLOB', 'BLOT', 'BLOW', 'BLUE', 'BLUR', 'BOAR', 'BOAT', 'BODY', 'BOIL', 'BOLD', 'BOLT', 'BOMB', 'BOND', 'BONE', 'BONY', 'BOOK', 'BOOM', 'BOOT', 'BORE', 'BORN', 'BOSS', 'BOTH', 'BOUT', 'BOWL', 'BOWS', 'BOYS', 'BRAG', 'BRED', 'BREW', 'BRIM', 'BROW', 'BUCK', 'BUDS', 'BUFF', 'BUGS', 'BULB', 'BULK', 'BULL', 'BUMP', 'BUNK', 'BUNS', 'BURN', 'BURY', 'BUSH', 'BUST', 'BUSY', 'BUTT', 'BUYS', 'BUZZ',
  'CAFE', 'CAGE', 'CAKE', 'CALF', 'CALL', 'CALM', 'CAME', 'CAMP', 'CANE', 'CANS', 'CAPE', 'CAPS', 'CARD', 'CARE', 'CARP', 'CARS', 'CART', 'CASE', 'CASH', 'CAST', 'CATS', 'CAVE', 'CELL', 'CENT', 'CHAT', 'CHEF', 'CHEW', 'CHIN', 'CHIP', 'CHOP', 'CITY', 'CLAM', 'CLAP', 'CLAW', 'CLAY', 'CLIP', 'CLUB', 'CLUE', 'COAL', 'COAT', 'COBS', 'CODE', 'COGS', 'COIL', 'COIN', 'COLD', 'COLT', 'COMB', 'COME', 'CONE', 'COOK', 'COOL', 'COPE', 'COPS', 'COPY', 'CORD', 'CORE', 'CORK', 'CORN', 'COST', 'COUP', 'COVE', 'COWS', 'COZY', 'CRAB', 'CRAM', 'CREW', 'CRIB', 'CROP', 'CROW', 'CUBE', 'CUBS', 'CUFF', 'CULT', 'CUPS', 'CURB', 'CURE', 'CURL', 'CUTE', 'CUTS',
  'DABS', 'DADS', 'DAME', 'DAMP', 'DAMS', 'DARE', 'DARK', 'DART', 'DASH', 'DATA', 'DATE', 'DAWN', 'DAYS', 'DEAD', 'DEAF', 'DEAL', 'DEAN', 'DEAR', 'DEBT', 'DECK', 'DEED', 'DEEP', 'DEER', 'DEMO', 'DENT', 'DENY', 'DESK', 'DIAL', 'DICE', 'DIED', 'DIES', 'DIET', 'DIGS', 'DIME', 'DIMS', 'DINE', 'DING', 'DIPS', 'DIRE', 'DIRT', 'DISC', 'DISH', 'DISK', 'DIVE', 'DOCK', 'DOCS', 'DOER', 'DOES', 'DOGS', 'DOLE', 'DOLL', 'DOME', 'DONE', 'DOOM', 'DOOR', 'DOPE', 'DOSE', 'DOTS', 'DOVE', 'DOWN', 'DOZE', 'DRAG', 'DRAW', 'DREW', 'DRIP', 'DROP', 'DRUG', 'DRUM', 'DUAL', 'DUCK', 'DUEL', 'DUES', 'DUKE', 'DULL', 'DUMB', 'DUMP', 'DUNE', 'DUNK', 'DUPE', 'DUSK', 'DUST', 'DUTY',
  'EACH', 'EARL', 'EARN', 'EARS', 'EASE', 'EAST', 'EASY', 'EATS', 'ECHO', 'EDGE', 'EDIT', 'EELS', 'EGGS', 'ELSE', 'EMIT', 'ENDS', 'ENVY', 'EPIC', 'EVEN', 'EVER', 'EVES', 'EVIL', 'EXAM', 'EXIT', 'EYED', 'EYES',
  'FACE', 'FACT', 'FADE', 'FAIL', 'FAIR', 'FAKE', 'FALL', 'FAME', 'FANG', 'FANS', 'FARE', 'FARM', 'FAST', 'FATE', 'FATS', 'FAWN', 'FEAR', 'FEAT', 'FEED', 'FEEL', 'FEES', 'FEET', 'FELL', 'FELT', 'FEND', 'FERN', 'FEST', 'FIGS', 'FILE', 'FILL', 'FILM', 'FIND', 'FINE', 'FINS', 'FIRE', 'FIRM', 'FIRS', 'FISH', 'FIST', 'FITS', 'FIVE', 'FLAG', 'FLAK', 'FLAP', 'FLAT', 'FLAW', 'FLEA', 'FLED', 'FLEE', 'FLEW', 'FLIP', 'FLIT', 'FLOG', 'FLOP', 'FLOW', 'FOAM', 'FOBS', 'FOES', 'FOGS', 'FOIL', 'FOLD', 'FOLK', 'FOND', 'FONT', 'FOOD', 'FOOL', 'FOOT', 'FORD', 'FORE', 'FORK', 'FORM', 'FORT', 'FOUL', 'FOUR', 'FOWL', 'FRAY', 'FREE', 'FRET', 'FROG', 'FROM', 'FUEL', 'FULL', 'FUME', 'FUND', 'FUNK', 'FURS', 'FURY', 'FUSE', 'FUSS', 'FUZZ',
  'GABS', 'GAIN', 'GAIT', 'GALE', 'GALL', 'GAME', 'GANG', 'GAPS', 'GARB', 'GASH', 'GASP', 'GATE', 'GAVE', 'GAWK', 'GAZE', 'GEAR', 'GEEK', 'GELS', 'GEMS', 'GENE', 'GERM', 'GETS', 'GIFT', 'GIGS', 'GILL', 'GILD', 'GILT', 'GINS', 'GIRL', 'GIST', 'GIVE', 'GLAD', 'GLEE', 'GLEN', 'GLIB', 'GLOB', 'GLOW', 'GLUE', 'GLUM', 'GLUT', 'GNAT', 'GNAW', 'GOAD', 'GOAL', 'GOAT', 'GOBS', 'GODS', 'GOER', 'GOES', 'GOLD', 'GOLF', 'GONE', 'GONG', 'GOOD', 'GOOF', 'GOON', 'GORE', 'GORY', 'GOSH', 'GOUT', 'GOWN', 'GRAB', 'GRAD', 'GRAM', 'GRAN', 'GRAY', 'GREW', 'GREY', 'GRID', 'GRIM', 'GRIN', 'GRIP', 'GRIT', 'GROW', 'GRUB', 'GULF', 'GULP', 'GUMS', 'GUNK', 'GUNS', 'GURU', 'GUSH', 'GUST', 'GUTS', 'GUYS', 'GYMS',
  'HACK', 'HAIL', 'HAIR', 'HALF', 'HALL', 'HALT', 'HAMS', 'HAND', 'HANG', 'HARD', 'HARE', 'HARM', 'HARP', 'HASH', 'HATE', 'HATS', 'HAUL', 'HAVE', 'HAWK', 'HAZE', 'HAZY', 'HEAD', 'HEAL', 'HEAP', 'HEAR', 'HEAT', 'HECK', 'HEED', 'HEEL', 'HEIR', 'HELD', 'HELL', 'HELM', 'HELP', 'HEMS', 'HENS', 'HERB', 'HERD', 'HERE', 'HERO', 'HERS', 'HEWN', 'HEWS', 'HIDE', 'HIGH', 'HIKE', 'HILL', 'HILT', 'HIND', 'HINT', 'HIPS', 'HIRE', 'HITS', 'HIVE', 'HOAX', 'HOBS', 'HOCK', 'HOED', 'HOES', 'HOGS', 'HOLD', 'HOLE', 'HOLY', 'HOME', 'HONE', 'HOOD', 'HOOF', 'HOOK', 'HOOP', 'HOOT', 'HOPE', 'HOPS', 'HORN', 'HOSE', 'HOST', 'HOUR', 'HOWL', 'HUBS', 'HUED', 'HUES', 'HUFF', 'HUGE', 'HUGS', 'HULK', 'HULL', 'HUMP', 'HUMS', 'HUNG', 'HUNK', 'HUNT', 'HURL', 'HURT', 'HUSH', 'HUSK', 'HUTS', 'HYMN', 'HYPE',
  'ICED', 'ICES', 'ICON', 'IDEA', 'IDLE', 'IDLY', 'IDOL', 'ILLS', 'IMPS', 'INCH', 'INFO', 'INKS', 'INKY', 'INNS', 'INTO', 'IONS', 'IRES', 'IRIS', 'IRKS', 'IRON', 'ISLE', 'ITCH', 'ITEM',
  'JABS', 'JACK', 'JADE', 'JAGS', 'JAIL', 'JAMS', 'JARS', 'JAVA', 'JAWS', 'JAYS', 'JAZZ', 'JEAN', 'JEEP', 'JEER', 'JELL', 'JERK', 'JEST', 'JETS', 'JIBE', 'JIGS', 'JILT', 'JINX', 'JIVE', 'JOBS', 'JOCK', 'JOGS', 'JOIN', 'JOKE', 'JOLT', 'JOSH', 'JOTS', 'JOWL', 'JOYS', 'JUDO', 'JUGS', 'JUMP', 'JUNK', 'JURY', 'JUST', 'JUTS',
  'KALE', 'KEEN', 'KEEP', 'KEGS', 'KELP', 'KEPT', 'KEYS', 'KICK', 'KIDS', 'KILL', 'KILN', 'KILT', 'KIND', 'KING', 'KINK', 'KISS', 'KITE', 'KITS', 'KIWI', 'KNEE', 'KNEW', 'KNIT', 'KNOB', 'KNOT', 'KNOW',
  'LABS', 'LACE', 'LACK', 'LACY', 'LADS', 'LADY', 'LAGS', 'LAID', 'LAIR', 'LAKE', 'LAMB', 'LAME', 'LAMP', 'LAND', 'LANE', 'LAPS', 'LARD', 'LARK', 'LASH', 'LASS', 'LAST', 'LATE', 'LAUD', 'LAVA', 'LAWN', 'LAWS', 'LAYS', 'LAZE', 'LAZY', 'LEAD', 'LEAF', 'LEAK', 'LEAN', 'LEAP', 'LEAS', 'LEFT', 'LEGS', 'LEND', 'LENS', 'LENT', 'LESS', 'LIAR', 'LICE', 'LICK', 'LIDS', 'LIED', 'LIEN', 'LIES', 'LIFE', 'LIFT', 'LIKE', 'LILY', 'LIMB', 'LIME', 'LIMP', 'LINE', 'LINK', 'LINT', 'LION', 'LIPS', 'LIST', 'LITE', 'LIVE', 'LOAD', 'LOAF', 'LOAM', 'LOAN', 'LOBE', 'LOBS', 'LOCK', 'LOCO', 'LODE', 'LOFT', 'LOGO', 'LOGS', 'LOIN', 'LONE', 'LONG', 'LOOK', 'LOOM', 'LOON', 'LOOP', 'LOOT', 'LOPE', 'LORD', 'LORE', 'LOSE', 'LOSS', 'LOST', 'LOTS', 'LOUD', 'LOUT', 'LOVE', 'LOWS', 'LUCK', 'LUGE', 'LUGS', 'LULL', 'LUMP', 'LUNG', 'LURE', 'LURK', 'LUSH', 'LUST', 'LUTE',
  'MACE', 'MADE', 'MAID', 'MAIL', 'MAIM', 'MAIN', 'MAKE', 'MALE', 'MALL', 'MALT', 'MANE', 'MANY', 'MAPS', 'MARE', 'MARK', 'MARS', 'MASH', 'MASK', 'MASS', 'MAST', 'MATE', 'MATH', 'MATS', 'MAUL', 'MAZE', 'MEAL', 'MEAN', 'MEAT', 'MEEK', 'MEET', 'MELD', 'MELT', 'MEMO', 'MEND', 'MENU', 'MERE', 'MESH', 'MESS', 'MICE', 'MILD', 'MILE', 'MILK', 'MILL', 'MIME', 'MIND', 'MINE', 'MINI', 'MINK', 'MINT', 'MIRE', 'MISS', 'MIST', 'MITE', 'MITT', 'MOAN', 'MOAT', 'MOBS', 'MOCK', 'MODE', 'MODS', 'MOLD', 'MOLE', 'MOLT', 'MOMS', 'MONK', 'MOOD', 'MOON', 'MOOR', 'MOOT', 'MOPE', 'MOPS', 'MORE', 'MORN', 'MOSS', 'MOST', 'MOTH', 'MOVE', 'MOWS', 'MUCH', 'MUCK', 'MUDS', 'MUFF', 'MUGS', 'MULE', 'MULL', 'MUMS', 'MURK', 'MUSE', 'MUSH', 'MUSK', 'MUST', 'MUTE', 'MUTT', 'MYTH',
  'NABS', 'NAGS', 'NAIL', 'NAME', 'NAPE', 'NAPS', 'NAVE', 'NAVY', 'NAYS', 'NEAR', 'NEAT', 'NECK', 'NEED', 'NEON', 'NERD', 'NEST', 'NETS', 'NEWS', 'NEWT', 'NEXT', 'NICE', 'NICK', 'NIGH', 'NINE', 'NIPS', 'NITS', 'NODE', 'NODS', 'NONE', 'NOOK', 'NOON', 'NOPE', 'NORM', 'NOSE', 'NOSY', 'NOTE', 'NOUN', 'NOVA', 'NUBS', 'NUDE', 'NUKE', 'NULL', 'NUMB', 'NUNS', 'NUTS',
  'OAFS', 'OAKS', 'OARS', 'OATH', 'OATS', 'OBEY', 'ODDS', 'ODES', 'ODOR', 'OFFS', 'OGRE', 'OHMS', 'OILS', 'OILY', 'OINK', 'OKAY', 'OKRA', 'OMEN', 'OMIT', 'ONCE', 'ONES', 'ONLY', 'ONTO', 'ONUS', 'OOZE', 'OOZY', 'OPAL', 'OPEN', 'OPTS', 'OPUS', 'ORAL', 'ORBS', 'ORES', 'OURS', 'OUST', 'OUTS', 'OVAL', 'OVEN', 'OVER', 'OWED', 'OWES', 'OWLS', 'OWNS', 'OXEN',
  'PACE', 'PACK', 'PACT', 'PADS', 'PAGE', 'PAID', 'PAIL', 'PAIN', 'PAIR', 'PALE', 'PALM', 'PALS', 'PANE', 'PANG', 'PANS', 'PANT', 'PARE', 'PARK', 'PART', 'PASS', 'PAST', 'PATE', 'PATH', 'PATS', 'PAVE', 'PAWN', 'PAWS', 'PAYS', 'PEAK', 'PEAL', 'PEAR', 'PEAS', 'PEAT', 'PECK', 'PEEL', 'PEEP', 'PEER', 'PEGS', 'PELT', 'PEND', 'PENS', 'PENT', 'PEON', 'PEPS', 'PERK', 'PERM', 'PERT', 'PESO', 'PEST', 'PETS', 'PEWS', 'PICK', 'PIED', 'PIER', 'PIES', 'PIGS', 'PIKE', 'PILE', 'PILL', 'PIMP', 'PINE', 'PING', 'PINK', 'PINS', 'PINT', 'PIPE', 'PIPS', 'PITA', 'PITH', 'PITS', 'PITY', 'PLAN', 'PLAY', 'PLEA', 'PLED', 'PLOD', 'PLOP', 'PLOT', 'PLOW', 'PLOY', 'PLUG', 'PLUM', 'PLUS', 'PODS', 'POEM', 'POET', 'POKE', 'POKY', 'POLE', 'POLL', 'POLO', 'POMP', 'POND', 'PONY', 'POOL', 'POOP', 'POOR', 'POPE', 'POPS', 'PORE', 'PORK', 'PORT', 'POSE', 'POSH', 'POST', 'POTS', 'POUR', 'POUT', 'PRAM', 'PRAY', 'PREP', 'PREY', 'PRIM', 'PROD', 'PROM', 'PROP', 'PROS', 'PROW', 'PUBS', 'PUCK', 'PUFF', 'PUGS', 'PUKE', 'PULL', 'PULP', 'PUMA', 'PUMP', 'PUNS', 'PUNY', 'PUPS', 'PURE', 'PURR', 'PUSH', 'PUTS', 'PUTT',
  'QUAD', 'QUAY', 'QUIT', 'QUIZ',
  'RACE', 'RACK', 'RAFT', 'RAGE', 'RAGS', 'RAID', 'RAIL', 'RAIN', 'RAKE', 'RAMP', 'RAMS', 'RANG', 'RANK', 'RANT', 'RAPS', 'RARE', 'RASH', 'RASP', 'RATE', 'RATS', 'RAVE', 'RAYS', 'RAZE', 'READ', 'REAL', 'REAM', 'REAP', 'REAR', 'REDO', 'REDS', 'REED', 'REEF', 'REEK', 'REEL', 'REFS', 'REIN', 'RELY', 'REND', 'RENT', 'REPS', 'REST', 'RICE', 'RICH', 'RIDE', 'RIDS', 'RIFE', 'RIFT', 'RIGS', 'RILE', 'RILL', 'RIMS', 'RIND', 'RING', 'RINK', 'RIOT', 'RIPE', 'RIPS', 'RISE', 'RISK', 'RITE', 'ROAD', 'ROAM', 'ROAR', 'ROBE', 'ROBS', 'ROCK', 'RODE', 'RODS', 'ROES', 'ROIL', 'ROLE', 'ROLL', 'ROMP', 'ROOF', 'ROOK', 'ROOM', 'ROOT', 'ROPE', 'ROPY', 'ROSE', 'ROSY', 'ROTE', 'ROTS', 'ROUT', 'ROVE', 'ROWS', 'RUBS', 'RUBY', 'RUCK', 'RUDE', 'RUED', 'RUES', 'RUFF', 'RUGS', 'RUIN', 'RULE', 'RUMP', 'RUMS', 'RUNE', 'RUNG', 'RUNS', 'RUNT', 'RUSE', 'RUSH', 'RUST', 'RUTS',
  'SACK', 'SAFE', 'SAGA', 'SAGE', 'SAGS', 'SAID', 'SAIL', 'SAKE', 'SALE', 'SALT', 'SAME', 'SAND', 'SANE', 'SANG', 'SANK', 'SAPS', 'SASH', 'SASS', 'SATE', 'SAVE', 'SAWS', 'SAYS', 'SCAB', 'SCAM', 'SCAN', 'SCAR', 'SCAT', 'SEAL', 'SEAM', 'SEAR', 'SEAS', 'SEAT', 'SECT', 'SEED', 'SEEK', 'SEEM', 'SEEN', 'SEEP', 'SEER', 'SEES', 'SELF', 'SELL', 'SEMI', 'SEND', 'SENT', 'SEPT', 'SETS', 'SEWN', 'SEWS', 'SHED', 'SHIM', 'SHIN', 'SHIP', 'SHOD', 'SHOE', 'SHOO', 'SHOP', 'SHOT', 'SHOW', 'SHUN', 'SHUT', 'SICK', 'SIDE', 'SIFT', 'SIGH', 'SIGN', 'SILK', 'SILL', 'SILO', 'SILT', 'SINE', 'SING', 'SINK', 'SINS', 'SIPS', 'SIRE', 'SIRS', 'SITE', 'SITS', 'SIZE', 'SKID', 'SKIM', 'SKIN', 'SKIP', 'SKIT', 'SKIS', 'SLAB', 'SLAG', 'SLAM', 'SLAP', 'SLAT', 'SLAW', 'SLAY', 'SLED', 'SLEW', 'SLID', 'SLIM', 'SLIT', 'SLOB', 'SLOE', 'SLOG', 'SLOP', 'SLOT', 'SLOW', 'SLUB', 'SLUE', 'SLUG', 'SLUM', 'SLUR', 'SMOG', 'SNAG', 'SNAP', 'SNIP', 'SNIT', 'SNOB', 'SNOT', 'SNOW', 'SNUB', 'SNUG', 'SOAK', 'SOAP', 'SOAR', 'SOBS', 'SOCK', 'SODA', 'SODS', 'SOFA', 'SOFT', 'SOIL', 'SOLD', 'SOLE', 'SOLO', 'SOME', 'SONG', 'SONS', 'SOON', 'SOOT', 'SOPS', 'SORE', 'SORT', 'SOUL', 'SOUP', 'SOUR', 'SOWN', 'SOWS', 'SPAN', 'SPAR', 'SPAS', 'SPAT', 'SPEC', 'SPED', 'SPEW', 'SPIN', 'SPIT', 'SPOT', 'SPRY', 'SPUD', 'SPUN', 'SPUR', 'STAB', 'STAG', 'STAR', 'STAT', 'STAY', 'STEM', 'STEP', 'STEW', 'STIR', 'STOP', 'STOW', 'STUB', 'STUD', 'STUN', 'STYE', 'SUBS', 'SUCH', 'SUCK', 'SUDS', 'SUED', 'SUES', 'SUIT', 'SULK', 'SUMO', 'SUMS', 'SUNG', 'SUNK', 'SUNS', 'SUPS', 'SURE', 'SURF', 'SWAB', 'SWAM', 'SWAN', 'SWAP', 'SWAT', 'SWAY', 'SWIM', 'SWUM', 'SYNC',
  'TABS', 'TACK', 'TACO', 'TACT', 'TADS', 'TAGS', 'TAIL', 'TAKE', 'TALE', 'TALK', 'TALL', 'TAME', 'TAMP', 'TANS', 'TAPE', 'TAPS', 'TARN', 'TARP', 'TARS', 'TART', 'TASK', 'TAXI', 'TEAK', 'TEAL', 'TEAM', 'TEAR', 'TEAS', 'TEAT', 'TECH', 'TEEM', 'TEEN', 'TELL', 'TEMP', 'TEND', 'TENS', 'TENT', 'TERM', 'TEST', 'TEXT', 'THAN', 'THAT', 'THAW', 'THEM', 'THEN', 'THEY', 'THIN', 'THIS', 'THUD', 'THUG', 'THUS', 'TICK', 'TIDE', 'TIDY', 'TIED', 'TIER', 'TIES', 'TIFF', 'TILE', 'TILL', 'TILT', 'TIME', 'TINE', 'TING', 'TINS', 'TINT', 'TINY', 'TIPS', 'TIRE', 'TOAD', 'TOES', 'TOFU', 'TOGA', 'TOGS', 'TOIL', 'TOLD', 'TOLL', 'TOMB', 'TOME', 'TONE', 'TONS', 'TOOK', 'TOOL', 'TOOT', 'TOPS', 'TORE', 'TORN', 'TOSS', 'TOTE', 'TOTS', 'TOUR', 'TOUT', 'TOWN', 'TOWS', 'TOYS', 'TRAM', 'TRAP', 'TRAY', 'TREE', 'TREK', 'TRIM', 'TRIO', 'TRIP', 'TROD', 'TROT', 'TRUE', 'TSAR', 'TUBA', 'TUBE', 'TUBS', 'TUCK', 'TUFT', 'TUGS', 'TUNA', 'TUNE', 'TURF', 'TURN', 'TUSK', 'TWIG', 'TWIN', 'TWIT', 'TWOS', 'TYPE',
  'UGLY', 'UNDO', 'UNIT', 'UNTO', 'UPON', 'URGE', 'URNS', 'USED', 'USER', 'USES',
  'VAIN', 'VALE', 'VAMP', 'VANE', 'VANS', 'VARY', 'VASE', 'VAST', 'VATS', 'VEAL', 'VEER', 'VEIL', 'VEIN', 'VENT', 'VERB', 'VERY', 'VEST', 'VETO', 'VETS', 'VIAL', 'VIBE', 'VICE', 'VIED', 'VIES', 'VIEW', 'VILE', 'VINE', 'VISA', 'VISE', 'VOID', 'VOLT', 'VOTE', 'VOWS',
  'WADE', 'WADS', 'WAFT', 'WAGE', 'WAGS', 'WAIF', 'WAIL', 'WAIT', 'WAKE', 'WALK', 'WALL', 'WAND', 'WANE', 'WANT', 'WARD', 'WARE', 'WARM', 'WARN', 'WARP', 'WARS', 'WART', 'WARY', 'WASH', 'WASP', 'WATT', 'WAVE', 'WAVY', 'WAXY', 'WAYS', 'WEAK', 'WEAL', 'WEAR', 'WEBS', 'WEDS', 'WEED', 'WEEK', 'WEEP', 'WELD', 'WELL', 'WELT', 'WENT', 'WEPT', 'WERE', 'WEST', 'WETS', 'WHAM', 'WHAT', 'WHEN', 'WHET', 'WHEW', 'WHEY', 'WHIM', 'WHIP', 'WHIR', 'WHIT', 'WHIZ', 'WHOM', 'WICK', 'WIDE', 'WIFE', 'WIGS', 'WILD', 'WILL', 'WILT', 'WIMP', 'WIND', 'WINE', 'WING', 'WINK', 'WINS', 'WIPE', 'WIRE', 'WIRY', 'WISE', 'WISH', 'WISP', 'WITH', 'WITS', 'WOES', 'WOKE', 'WOKS', 'WOLF', 'WOMB', 'WONT', 'WOOD', 'WOOF', 'WOOL', 'WOOS', 'WORD', 'WORE', 'WORK', 'WORM', 'WORN', 'WORT', 'WOVE', 'WOWS', 'WRAP', 'WREN',
  'YACK', 'YAKS', 'YAMS', 'YANG', 'YANK', 'YAPS', 'YARD', 'YARN', 'YAWL', 'YAWN', 'YAWS', 'YEAH', 'YEAR', 'YEAS', 'YELL', 'YELP', 'YENS', 'YEPS', 'YEWS', 'YIPE', 'YIPS', 'YOKE', 'YOLK', 'YORE', 'YOUR', 'YOWL', 'YOWS', 'YUAN', 'YUCK', 'YULE', 'YUPS',
  'ZANY', 'ZAPS', 'ZEAL', 'ZERO', 'ZEST', 'ZINC', 'ZING', 'ZIPS', 'ZITS', 'ZONE', 'ZOOM', 'ZOOS',
]);

/**
 * Result of finding a valid word.
 */
export interface FoundWord {
  word: string;
  path: number[];
}

/**
 * Get adjacent cell indices for a given cell index in a grid.
 * Adjacent cells include all 8 neighbors (orthogonal and diagonal).
 *
 * @param index Cell index (0-based)
 * @param gridSize Size of the grid (e.g., 5 for 5x5)
 * @returns Array of adjacent cell indices
 */
export function getAdjacentCells(index: number, gridSize: number): number[] {
  const row = Math.floor(index / gridSize);
  const col = index % gridSize;
  const adjacent: number[] = [];

  // Check all 8 directions
  for (let dRow = -1; dRow <= 1; dRow++) {
    for (let dCol = -1; dCol <= 1; dCol++) {
      if (dRow === 0 && dCol === 0) continue; // Skip self

      const newRow = row + dRow;
      const newCol = col + dCol;

      // Check bounds
      if (newRow >= 0 && newRow < gridSize && newCol >= 0 && newCol < gridSize) {
        adjacent.push(newRow * gridSize + newCol);
      }
    }
  }

  return adjacent;
}

/**
 * Find valid words that can be traced on the grid.
 * Uses DFS to find paths that spell valid dictionary words.
 *
 * @param letters Array of letters on the grid (uppercase)
 * @param gridSize Size of the grid (e.g., 5 for 5x5)
 * @returns Array of found words with their paths
 */
export function findValidWords(letters: string[], gridSize: number): FoundWord[] {
  const foundWords: FoundWord[] = [];
  const foundWordSet = new Set<string>(); // Avoid duplicates

  // Normalize letters to uppercase
  const normalizedLetters = letters.map(l => l.toUpperCase());

  // Build adjacency list for efficient neighbor lookup
  const adjacencyList: number[][] = [];
  for (let i = 0; i < normalizedLetters.length; i++) {
    adjacencyList[i] = getAdjacentCells(i, gridSize);
  }

  // Build letter index map for quick lookup
  const letterPositions: Map<string, number[]> = new Map();
  normalizedLetters.forEach((letter, index) => {
    if (!letterPositions.has(letter)) {
      letterPositions.set(letter, []);
    }
    letterPositions.get(letter)!.push(index);
  });

  // DFS to find paths spelling a word
  function findWordPath(word: string): number[] | null {
    const wordChars = word.split('');

    // Get all starting positions for the first letter
    const startPositions = letterPositions.get(wordChars[0]) || [];

    for (const startPos of startPositions) {
      const result = dfs(startPos, 1, [startPos], new Set([startPos]));
      if (result) return result;
    }

    return null;

    function dfs(pos: number, charIndex: number, path: number[], visited: Set<number>): number[] | null {
      if (charIndex === wordChars.length) {
        return path;
      }

      const nextChar = wordChars[charIndex];
      const neighbors = adjacencyList[pos];

      for (const neighbor of neighbors) {
        if (visited.has(neighbor)) continue;
        if (normalizedLetters[neighbor] !== nextChar) continue;

        visited.add(neighbor);
        const result = dfs(neighbor, charIndex + 1, [...path, neighbor], visited);
        if (result) return result;
        visited.delete(neighbor);
      }

      return null;
    }
  }

  // Try each word in our dictionary
  for (const word of COMMON_WORDS) {
    if (word.length < 3) continue; // Skip very short words
    if (foundWordSet.has(word)) continue;

    const path = findWordPath(word);
    if (path) {
      foundWords.push({ word, path });
      foundWordSet.add(word);
    }
  }

  // Sort by word length (descending) and then alphabetically
  foundWords.sort((a, b) => {
    if (b.word.length !== a.word.length) {
      return b.word.length - a.word.length;
    }
    return a.word.localeCompare(b.word);
  });

  return foundWords;
}

/**
 * Find a specified number of valid words, excluding already found words.
 * Useful for ensuring different players submit different words.
 *
 * @param letters Array of letters on the grid
 * @param gridSize Size of the grid
 * @param count Number of words to find
 * @param excludeWords Words to exclude (e.g., already submitted)
 * @returns Array of found words with their paths
 */
export function findDistinctWords(
  letters: string[],
  gridSize: number,
  count: number,
  excludeWords: string[] = []
): FoundWord[] {
  const allWords = findValidWords(letters, gridSize);
  const excludeSet = new Set(excludeWords.map(w => w.toUpperCase()));

  const result: FoundWord[] = [];
  for (const word of allWords) {
    if (excludeSet.has(word.word)) continue;
    result.push(word);
    if (result.length >= count) break;
  }

  return result;
}
